const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const studentSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  studentID: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
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
  currentClass: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    default: 'A',
    trim: true
  },
  currentSession: {
    type: String,
    required: true,
    trim: true
  },
  admissionDate: {
    type: Date,
    default: Date.now
  },
  // History of classes and sessions
  archivedSessions: [{
    sessionName: String,
    className: String,
    promoted: Boolean,
    promotionDate: Date
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to hash password
studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    this.updatedAt = Date.now();
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
studentSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get age
studentSchema.methods.getAge = function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

module.exports = mongoose.model('Student', studentSchema);