const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Student = require('../models/Student');
const School = require('../models/School');
const Announcement = require('../models/Announcement');

// Landing Page
router.get('/', async (req, res) => {
  try {
    const school = await School.findOne();
    const announcements = await Announcement.find({
      isActive: true,
      targetAudience: { $in: ['all'] }
    }).sort({ createdAt: -1 }).limit(3);
    
    res.render('pages/landing', {
      title: 'Welcome to EduControl NG',
      school: school,
      announcements
    });
  } catch (error) {
    console.error('Error loading landing page:', error);
    res.render('pages/landing', {
      title: 'Welcome to EduControl NG',
      school: null,
      announcements: []
    });
  }
});

// Login Page
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('pages/login', {
    title: 'Login - EduControl NG',
    error: null
  });
});

// Login POST - COMPLETELY FIXED for student authentication
router.post('/login', async (req, res) => {
  const { email, password, loginType } = req.body;

  console.log('Login attempt:', { email, loginType });

  try {
    if (loginType === 'student') {
      // Student login using Student ID
      console.log('Attempting student login with ID:', email);
      const student = await Student.findOne({ studentID: email });
      
      if (!student) {
        console.log('Student login failed: Student not found');
        return res.render('pages/login', {
          title: 'Login - EduControl NG',
          error: 'Invalid Student ID or Password'
        });
      }

      console.log('Student found:', {
        id: student.studentID,
        name: student.fullName,
        isActive: student.isActive
      });

      // FIXED: Use comparePassword method correctly
      console.log('Checking password...');
      const isValidPassword = await student.comparePassword(password);
      console.log('Password validation result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('Student login failed: Invalid password');
        return res.render('pages/login', {
          title: 'Login - EduControl NG',
          error: 'Invalid Student ID or Password'
        });
      }

      if (!student.isActive) {
        console.log('Student login failed: Account deactivated');
        return res.render('pages/login', {
          title: 'Login - EduControl NG',
          error: 'Your account has been deactivated. Contact the school administration.'
        });
      }

      req.session.user = {
        id: student._id,
        name: student.fullName,
        studentID: student.studentID,
        role: 'student',
        currentClass: student.currentClass,
        currentSession: student.currentSession
      };

      console.log('Student login successful');
      
      // Get announcements for popup
      const announcements = await Announcement.find({
        isActive: true,
        targetAudience: { $in: ['all', 'students'] }
      }).sort({ createdAt: -1 }).limit(3);
      
      req.session.announcements = announcements;
      
      return res.redirect('/student/portal');
    } else {
      // Staff login
      console.log('Looking for staff user with email:', email);
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log('Staff login failed: User not found');
        return res.render('pages/login', {
          title: 'Login - EduControl NG',
          error: 'Invalid email or password'
        });
      }

      console.log('Found user:', {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      });

      const isValidPassword = await user.comparePassword(password);
      console.log('Password validation result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('Staff login failed: Invalid password');
        return res.render('pages/login', {
          title: 'Login - EduControl NG',
          error: 'Invalid email or password'
        });
      }

      if (!user.isActive) {
        console.log('Staff login failed: Account deactivated');
        return res.render('pages/login', {
          title: 'Login - EduControl NG',
          error: 'Your account has been deactivated. Contact the administrator.'
        });
      }

      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedSubjects: user.assignedSubjects,
        assignedClasses: user.assignedClasses
      };

      console.log('Staff login successful, redirecting to dashboard');
      return res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('pages/login', {
      title: 'Login - EduControl NG',
      error: 'An error occurred during login. Please try again.'
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;