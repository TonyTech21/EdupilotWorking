const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  className: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  level: {
    type: String,
    required: true,
    enum: ['Primary', 'Junior Secondary', 'Senior Secondary'],
    trim: true
  },
  sections: [{
    sectionName: {
      type: String,
      required: true,
      default: 'A'
    },
    capacity: {
      type: Number,
      default: 40
    }
  }],
  assignedSubjects: [{
    subjectName: {
      type: String,
      required: true,
      trim: true
    },
    subjectCode: {
      type: String,
      trim: true
    },
    isCore: {
      type: Boolean,
      default: true
    }
  }],
  classTeacher: {
    type: String,
    trim: true
  },
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

// Pre-save middleware
classSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get all subjects
classSchema.statics.getAllSubjects = function() {
  return this.aggregate([
    { $unwind: '$assignedSubjects' },
    { $group: { _id: '$assignedSubjects.subjectName' } },
    { $sort: { _id: 1 } }
  ]);
};

module.exports = mongoose.model('Class', classSchema);