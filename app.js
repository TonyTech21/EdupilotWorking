const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Import Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const resultRoutes = require('./routes/result');
const dashboardRoutes = require('./routes/dashboard');
const analyticsRoutes = require('./routes/analytics');
const practiceRoutes = require('./routes/practice');

// Import Models
require('./models/User');
require('./models/Student');
require('./models/Result');
require('./models/Class');
require('./models/Session');
require('./models/School');
require('./models/PracticeQuestion');
require('./models/PassedOutStudent');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  // store: MongoStore.create({
  //   mongoUrl: process.env.MONGODB_URI
  // }),
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Global Middleware for User Session
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/teacher', teacherRoutes);
app.use('/student', studentRoutes);
app.use('/result', resultRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/', practiceRoutes);

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB Atlas');
  // Initialize default data ONLY if needed
  initializeDefaultData();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});

// Initialize Default Data - FIXED to prevent dummy data
async function initializeDefaultData() {
  const User = require('./models/User');
  const School = require('./models/School');
  const Session = require('./models/Session');
  
  try {
    // Set default values if environment variables are not set
    const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@school.edu.ng';
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    
    console.log('Checking for default admin with email:', defaultAdminEmail);
    
   // Create or recreate default admin if needed
let existingAdmin = await User.findOne({ email: defaultAdminEmail });

if (!existingAdmin || !existingAdmin.password) {
  if (existingAdmin) {
    await User.deleteOne({ email: defaultAdminEmail });
    console.log('⚠️ Corrupted admin deleted from DB');
  }

  const bcrypt = require('bcrypt');
  

 await User.create({
  name: 'System Administrator',
  email: defaultAdminEmail,
  password: defaultAdminPassword, // plain text, will be hashed by the pre-save middleware
  role: 'admin',
  assignedSubjects: [],
  assignedClasses: []
});   

  console.log('✅ Default admin created again successfully');
  console.log(`Login email: ${defaultAdminEmail}`);
  console.log(`Password: ${defaultAdminPassword}`);
} else {
  console.log('✅ Default admin already exists and is valid');
}


    // Create default school profile ONLY if none exists
    const schoolExists = await School.findOne();
    if (!schoolExists) {
      await School.create({
        name: 'Your School Name',
        motto: 'Excellence in Education',
        address: 'School Address Here',
        phone: '+234-XXX-XXX-XXXX',
        email: 'info@yourschool.edu.ng',
        logo: '/images/default-logo.png',
        mission: 'To provide quality education that prepares students for success.',
        vision: 'To be a leading educational institution in Nigeria.',
        about: 'We are committed to academic excellence and character development.',
        gallery: []
      });
      console.log('Default school profile created');
    }

    // DO NOT create default session - let admin create sessions manually
    console.log('Initialization complete - no dummy sessions created');

  } catch (error) {
    console.error('Error initializing default data:', error);
  }
}

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Server Error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: {}
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`EduControl NG Server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
  console.log('Environment variables loaded:');
  console.log('- DEFAULT_ADMIN_EMAIL:', process.env.DEFAULT_ADMIN_EMAIL || 'admin@school.edu.ng (fallback)');
  console.log('- DEFAULT_ADMIN_PASSWORD:', process.env.DEFAULT_ADMIN_PASSWORD || 'admin123 (fallback)');
});

module.exports = app;