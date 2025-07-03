const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Student = require('../models/Student');
const Result = require('../models/Result');
const Session = require('../models/Session');
const { requireAuth, requireRole } = require('../middleware/auth');

// Dashboard Route
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    
    // Get current session
    const currentSession = await Session.getActiveSession();
    
    if (user.role === 'admin') {
      // Admin Dashboard
      const stats = await getAdminStats();
      res.render('pages/admin-dashboard', {
        title: 'Admin Dashboard',
        user,
        stats,
        currentSession
      });
    } else if (user.role === 'teacher') {
      // Teacher Dashboard
      const stats = await getTeacherStats(user);
      res.render('pages/teacher-dashboard', {
        title: 'Teacher Dashboard',
        user,
        stats,
        currentSession
      });
    } else if (user.role === 'officer') {
      // Result Officer Dashboard
      const stats = await getOfficerStats();
      res.render('pages/officer-dashboard', {
        title: 'Result Officer Dashboard',
        user,
        stats,
        currentSession
      });
    } else {
      res.redirect('/login');
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('pages/error', {
      title: 'Error',
      message: 'Unable to load dashboard',
      error
    });
  }
});

// Helper function to get admin statistics
async function getAdminStats() {
  try {
    const totalStudents = await Student.countDocuments({ isActive: true });
    const totalTeachers = await User.countDocuments({ role: 'teacher', isActive: true });
    const totalOfficers = await User.countDocuments({ role: 'officer', isActive: true });
    const publishedResults = await Result.countDocuments({ published: true });
    const unpublishedResults = await Result.countDocuments({ published: false });
    
    // Get students by class
    const studentsByClass = await Student.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$currentClass', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Get recent activities (last 10 results entered)
    const recentResults = await Result.find()
      .sort({ enteredAt: -1 })
      .limit(10)
      .select('studentName subject className term session enteredAt');

    return {
      totalStudents,
      totalTeachers,
      totalOfficers,
      publishedResults,
      unpublishedResults,
      studentsByClass,
      recentResults
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return {};
  }
}

// Helper function to get teacher statistics
async function getTeacherStats(user) {
  try {
    const assignedClasses = user.assignedClasses || [];
    const assignedSubjects = user.assignedSubjects || [];
    
    const studentsInClasses = await Student.countDocuments({
      currentClass: { $in: assignedClasses },
      isActive: true
    });
    
    const resultsEntered = await Result.countDocuments({
      enteredBy: user.email,
      subject: { $in: assignedSubjects }
    });
    
    const pendingResults = await Result.countDocuments({
      enteredBy: user.email,
      published: false
    });

    // Get recent results entered by this teacher
    const recentResults = await Result.find({
      enteredBy: user.email
    })
    .sort({ enteredAt: -1 })
    .limit(5)
    .select('studentName subject className total grade enteredAt');

    return {
      assignedClasses: assignedClasses.length,
      assignedSubjects: assignedSubjects.length,
      studentsInClasses,
      resultsEntered,
      pendingResults,
      recentResults
    };
  } catch (error) {
    console.error('Error getting teacher stats:', error);
    return {};
  }
}

// Helper function to get officer statistics
async function getOfficerStats() {
  try {
    const pendingApproval = await Result.countDocuments({ published: false });
    const approvedResults = await Result.countDocuments({ published: true });
    
    // Get results by class for approval
    const resultsByClass = await Result.aggregate([
      { $match: { published: false } },
      { $group: { _id: '$className', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Get recent approvals
    const recentApprovals = await Result.find({ published: true })
      .sort({ publishedAt: -1 })
      .limit(10)
      .select('studentName subject className publishedBy publishedAt');

    return {
      pendingApproval,
      approvedResults,
      resultsByClass,
      recentApprovals
    };
  } catch (error) {
    console.error('Error getting officer stats:', error);
    return {};
  }
}

module.exports = router;