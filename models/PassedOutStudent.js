const mongoose = require('mongoose');

const passedOutStudentSchema = new mongoose.Schema({
  // Original student data
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  studentID: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female']
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  parentPhone: {
    type: String,
    required: true,
    trim: true
  },
  parentEmail: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  passportURL: {
    type: String,
    default: '/images/default-avatar.png'
  },
  
  // Passing out details
  passedOutFromClass: {
    type: String,
    required: true,
    trim: true
  },
  passedOutFromSession: {
    type: String,
    required: true,
    trim: true
  },
  passedOutYear: {
    type: Number,
    required: true
  },
  overallAverage: {
    type: Number,
    default: 0
  },
  
  // Academic history
  archivedSessions: [{
    sessionName: String,
    className: String,
    promoted: Boolean,
    promotionDate: Date
  }],
  
  // Timestamps
  admissionDate: {
    type: Date
  },
  passedOutDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
passedOutStudentSchema.index({ passedOutYear: 1, passedOutFromClass: 1 });

module.exports = mongoose.model('PassedOutStudent', passedOutStudentSchema);