const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const Student = require('../models/Student');
const Session = require('../models/Session');
const School = require('../models/School');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendResultNotification } = require('../utils/emailService');

// Result approval (for admin and officer) - UPDATED for new status system
router.get('/approve', requireAuth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    
    // Only show results with 'sent' status
    const filter = { status: 'sent' };
    if (req.query.class) filter.className = req.query.class;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.term) filter.term = req.query.term;
    if (req.query.session) filter.session = req.query.session;
    
    const results = await Result.find(filter)
      .sort({ enteredAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalResults = await Result.countDocuments(filter);
    const totalPages = Math.ceil(totalResults / limit);
    
    // Get unique values for filters (only from sent results)
    const classes = await Result.distinct('className', { status: 'sent' });
    const subjects = await Result.distinct('subject', { status: 'sent' });
    const terms = await Result.distinct('term', { status: 'sent' });
    const sessions = await Result.distinct('session', { status: 'sent' });
    
    res.render('pages/result/approve', {
      title: 'Approve Results',
      results,
      classes,
      subjects,
      terms,
      sessions,
      currentPage: page,
      totalPages,
      query: req.query
    });
  } catch (error) {
    console.error('Error loading results for approval:', error);
    res.render('pages/error', { title: 'Error', message: 'Unable to load results', error });
  }
});

// Approve single result - UPDATED WITH EMAIL NOTIFICATION
router.post('/approve/:id', requireAuth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const user = req.session.user;
    const result = await Result.findById(req.params.id);
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }
    
    if (result.status !== 'sent') {
      return res.status(400).json({ success: false, message: 'Result is not ready for approval' });
    }
    
    result.status = 'approved';
    result.approvedBy = user.email;
    result.approvedAt = new Date();
    
    await result.save();
    
    // Calculate positions for the class after approval
    await Result.calculatePositions(result.className, result.term, result.session);
    
    // Send email notification to parent
    try {
      const student = await Student.findOne({ studentID: result.studentID });
      const school = await School.findOne();
      
      if (student && student.parentEmail) {
        // Get all approved results for this student for the same term and session
        const allResults = await Result.find({
          studentID: result.studentID,
          term: result.term,
          session: result.session,
          status: 'approved'
        }).sort({ subject: 1 });
        
        const emailResult = await sendResultNotification(
          student, 
          allResults, 
          school, 
          result.term, 
          result.session
        );
        
        if (emailResult.success) {
          console.log('Email notification sent successfully:', emailResult.message);
        } else {
          console.log('Email notification failed:', emailResult.message);
        }
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the approval if email fails
    }
    
    res.json({ success: true, message: 'Result approved successfully' });
  } catch (error) {
    console.error('Error approving result:', error);
    res.status(500).json({ success: false, message: 'Failed to approve result' });
  }
});

// Approve multiple results - UPDATED WITH EMAIL NOTIFICATIONS
router.post('/approve-multiple', requireAuth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const user = req.session.user;
    const { resultIds } = req.body;
    
    if (!resultIds || resultIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No results selected' });
    }
    
    const results = await Result.find({ 
      _id: { $in: resultIds },
      status: 'sent'
    });
    
    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid results found for approval' });
    }
    
    await Result.updateMany(
      { 
        _id: { $in: resultIds },
        status: 'sent'
      },
      { 
        status: 'approved',
        approvedBy: user.email, 
        approvedAt: new Date() 
      }
    );
    
    // Calculate positions for affected classes
    const classTermSessions = new Set();
    results.forEach(result => {
      classTermSessions.add(`${result.className}|${result.term}|${result.session}`);
    });
    
    for (const classTermSession of classTermSessions) {
      const [className, term, session] = classTermSession.split('|');
      await Result.calculatePositions(className, term, session);
    }
    
    // Send email notifications for each student
    try {
      const school = await School.findOne();
      const studentNotifications = new Map();
      
      // Group results by student
      for (const result of results) {
        if (!studentNotifications.has(result.studentID)) {
          studentNotifications.set(result.studentID, {
            term: result.term,
            session: result.session,
            results: []
          });
        }
        studentNotifications.get(result.studentID).results.push(result);
      }
      
      // Send notifications
      for (const [studentID, data] of studentNotifications) {
        const student = await Student.findOne({ studentID });
        
        if (student && student.parentEmail) {
          // Get all approved results for this student for the same term and session
          const allResults = await Result.find({
            studentID: studentID,
            term: data.term,
            session: data.session,
            status: 'approved'
          }).sort({ subject: 1 });
          
          const emailResult = await sendResultNotification(
            student, 
            allResults, 
            school, 
            data.term, 
            data.session
          );
          
          if (emailResult.success) {
            console.log(`Email sent to ${student.parentEmail} for ${student.fullName}`);
          } else {
            console.log(`Email failed for ${student.fullName}: ${emailResult.message}`);
          }
        }
      }
    } catch (emailError) {
      console.error('Error sending email notifications:', emailError);
      // Don't fail the approval if emails fail
    }
    
    res.json({ success: true, message: `${results.length} results approved successfully` });
  } catch (error) {
    console.error('Error approving multiple results:', error);
    res.status(500).json({ success: false, message: 'Failed to approve results' });
  }
});

// Publish Results for Class/Term - NEW ENDPOINT
router.post('/publish', requireAuth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { className, term, session } = req.body;
    const user = req.session.user;
    
    // Update all approved results for this class/term to published
    const updateResult = await Result.updateMany(
      {
        className,
        term,
        session,
        status: 'approved'
      },
      {
        publishedBy: user.email,
        publishedAt: new Date()
      }
    );
    
    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({ success: false, message: 'No approved results found to publish' });
    }
    
    // Recalculate positions after publishing
    await Result.calculatePositions(className, term, session);
    
    res.json({ 
      success: true, 
      message: `Results published for ${className} - ${term}, ${session}` 
    });
  } catch (error) {
    console.error('Error publishing results:', error);
    res.status(500).json({ success: false, message: 'Failed to publish results' });
  }
});

// View published results - UPDATED
router.get('/published', requireAuth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    
    // Only show approved results
    const filter = { status: 'approved' };
    if (req.query.class) filter.className = req.query.class;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.term) filter.term = req.query.term;
    if (req.query.session) filter.session = req.query.session;
    
    const results = await Result.find(filter)
      .sort({ approvedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalResults = await Result.countDocuments(filter);
    const totalPages = Math.ceil(totalResults / limit);
    
    // Get unique values for filters (only from approved results)
    const classes = await Result.distinct('className', { status: 'approved' });
    const subjects = await Result.distinct('subject', { status: 'approved' });
    const terms = await Result.distinct('term', { status: 'approved' });
    const sessions = await Result.distinct('session', { status: 'approved' });
    
    res.render('pages/result/published', {
      title: 'Published Results',
      results,
      classes,
      subjects,
      terms,
      sessions,
      currentPage: page,
      totalPages,
      query: req.query
    });
  } catch (error) {
    console.error('Error loading published results:', error);
    res.render('pages/error', { title: 'Error', message: 'Unable to load results', error });
  }
});

// Unpublish result (for admin only) - UPDATED
router.post('/unpublish/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }
    
    if (result.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Result is not approved' });
    }
    
    result.status = 'sent';
    result.approvedBy = null;
    result.approvedAt = null;
    result.publishedBy = null;
    result.publishedAt = null;
    result.position = null;
    
    await result.save();
    
    // Recalculate positions for the class
    await Result.calculatePositions(result.className, result.term, result.session);
    
    res.json({ success: true, message: 'Result unpublished successfully' });
  } catch (error) {
    console.error('Error unpublishing result:', error);
    res.status(500).json({ success: false, message: 'Failed to unpublish result' });
  }
});

module.exports = router;