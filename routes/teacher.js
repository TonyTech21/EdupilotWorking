const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Session = require('../models/Session');
const { requireAuth, requireRole } = require('../middleware/auth');

// All teacher routes require authentication and teacher role
router.use(requireAuth);
router.use(requireRole('teacher'));

// Result Entry Page
router.get('/results', async (req, res) => {
  try {
    const user = req.session.user;
    const activeSession = await Session.getActiveSession();
    
    // Get assigned classes and subjects
    const assignedClasses = user.assignedClasses || [];
    const assignedSubjects = user.assignedSubjects || [];
    
    // Get filter parameters
    const selectedClass = req.query.class;
    const selectedSubject = req.query.subject;
    const selectedTerm = req.query.term || (activeSession ? activeSession.currentTerm : 'First Term');
    
    let students = [];
    let existingResults = [];
    
    if (selectedClass && selectedSubject) {
      // Get students in the selected class
      students = await Student.find({
        currentClass: selectedClass,
        isActive: true
      }).sort({ fullName: 1 });
      
      // Get existing results for this class and subject
      existingResults = await Result.find({
        className: selectedClass,
        subject: selectedSubject,
        term: selectedTerm,
        session: activeSession.sessionName
      });
    }
    
    res.render('pages/teacher/results', {
      title: 'Enter Results',
      user,
      assignedClasses,
      assignedSubjects,
      students,
      existingResults,
      selectedClass,
      selectedSubject,
      selectedTerm,
      activeSession
    });
  } catch (error) {
    console.error('Error loading results page:', error);
    res.render('pages/error', { title: 'Error', message: 'Unable to load results page', error });
  }
});

// Save Results
router.post('/results/save', async (req, res) => {
  try {
    const user = req.session.user;
    const { className, subject, term, session, results } = req.body;
    
    // Validate that teacher is assigned to this class and subject
    if (!user.assignedClasses.includes(className) || !user.assignedSubjects.includes(subject)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this class or subject' });
    }
    
    const resultPromises = results.map(async (result) => {
      const { studentID, studentName, ca1, ca2, exam } = result;
      
      // Find existing result or create new one
      const existingResult = await Result.findOne({
        studentID,
        className,
        subject,
        term,
        session
      });
      
      if (existingResult) {
        // Update existing result
        existingResult.ca1 = parseFloat(ca1) || 0;
        existingResult.ca2 = parseFloat(ca2) || 0;
        existingResult.exam = parseFloat(exam) || 0;
        existingResult.enteredBy = user.email;
        existingResult.published = false; // Reset published status when updated
        
        return existingResult.save();
      } else {
        // Create new result
        return Result.create({
          studentID,
          studentName,
          className,
          subject,
          term,
          session,
          ca1: parseFloat(ca1) || 0,
          ca2: parseFloat(ca2) || 0,
          exam: parseFloat(exam) || 0,
          enteredBy: user.email
        });
      }
    });
    
    await Promise.all(resultPromises);
    
    res.json({ success: true, message: 'Results saved successfully' });
  } catch (error) {
    console.error('Error saving results:', error);
    res.status(500).json({ success: false, message: 'Failed to save results' });
  }
});

// My Results (view entered results)
router.get('/my-results', async (req, res) => {
  try {
    const user = req.session.user;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    
    const filter = { enteredBy: user.email };
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
    
    // Get unique values for filters
    const classes = await Result.distinct('className', { enteredBy: user.email });
    const subjects = await Result.distinct('subject', { enteredBy: user.email });
    const terms = await Result.distinct('term', { enteredBy: user.email });
    const sessions = await Result.distinct('session', { enteredBy: user.email });
    
    res.render('pages/teacher/my-results', {
      title: 'My Results',
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
    console.error('Error loading my results:', error);
    res.render('pages/error', { title: 'Error', message: 'Unable to load results', error });
  }
});

// Class Lists
router.get('/classes', async (req, res) => {
  try {
    const user = req.session.user;
    const assignedClasses = user.assignedClasses || [];
    
    // Get students for each assigned class
    const classData = await Promise.all(
      assignedClasses.map(async (className) => {
        const students = await Student.find({
          currentClass: className,
          isActive: true
        }).sort({ fullName: 1 });
        
        return {
          className,
          students,
          count: students.length
        };
      })
    );
    
    res.render('pages/teacher/classes', {
      title: 'My Classes',
      classData
    });
  } catch (error) {
    console.error('Error loading classes:', error);
    res.render('pages/error', { title: 'Error', message: 'Unable to load classes', error });
  }
});

module.exports = router;