const mongoose = require('mongoose');

const practiceQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    text: {
      type: String,
      required: true,
      trim: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  correctAnswer: {
    type: String,
    required: true,
    trim: true
  },
  targetClass: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true,
    trim: true
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

// Pre-save middleware
practiceQuestionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get questions by class
practiceQuestionSchema.statics.getQuestionsByClass = function(className) {
  return this.find({ 
    targetClass: className, 
    isActive: true 
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('PracticeQuestion', practiceQuestionSchema);