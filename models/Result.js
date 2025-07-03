const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  studentID: {
    type: String,
    required: true,
    trim: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  className: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  term: {
    type: String,
    required: true,
    enum: ['First Term', 'Second Term', 'Third Term']
  },
  session: {
    type: String,
    required: true,
    trim: true
  },
  // Assessment Scores - Updated to new grading system
  ca1: {
    type: Number,
    required: true,
    min: 0,
    max: 15,
    default: 0
  },
  ca2: {
    type: Number,
    required: true,
    min: 0,
    max: 15,
    default: 0
  },
  exam: {
    type: Number,
    required: true,
    min: 0,
    max: 70,
    default: 0
  },
  // Calculated Fields
  total: {
    type: Number,
    default: 0
  },
  grade: {
    type: String,
    enum: ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'],
    default: 'F9'
  },
  remark: {
    type: String,
    enum: ['Excellent', 'Very Good', 'Good', 'Credit', 'Pass', 'Fail'],
    default: 'Fail'
  },
  position: {
    type: Number,
    default: null
  },
  // Status tracking - NEW FIELD
  status: {
    type: String,
    enum: ['draft', 'sent', 'approved'],
    default: 'draft'
  },
  // Status Tracking
  enteredBy: {
    type: String,
    required: true,
    trim: true
  },
  enteredAt: {
    type: Date,
    default: Date.now
  },
  sentAt: {
    type: Date
  },
  approvedBy: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate total, grade, and remark - UPDATED GRADING
resultSchema.pre('save', function(next) {
  // Calculate total
  this.total = this.ca1 + this.ca2 + this.exam;
  
  // Calculate grade based on total using new grading system
  const percentage = this.total;
  
  if (percentage >= 75) {
    this.grade = 'A1';
    this.remark = 'Excellent';
  } else if (percentage >= 70) {
    this.grade = 'B2';
    this.remark = 'Very Good';
  } else if (percentage >= 65) {
    this.grade = 'B3';
    this.remark = 'Good';
  } else if (percentage >= 60) {
    this.grade = 'C4';
    this.remark = 'Credit';
  } else if (percentage >= 55) {
    this.grade = 'C5';
    this.remark = 'Credit';
  } else if (percentage >= 50) {
    this.grade = 'C6';
    this.remark = 'Credit';
  } else if (percentage >= 45) {
    this.grade = 'D7';
    this.remark = 'Pass';
  } else if (percentage >= 40) {
    this.grade = 'E8';
    this.remark = 'Pass';
  } else {
    this.grade = 'F9';
    this.remark = 'Fail';
  }
  
  this.updatedAt = Date.now();
  next();
});

// Static method to calculate positions for a class - UPDATED
resultSchema.statics.calculatePositions = async function(className, term, session) {
  try {
    // Get all students in the class with their total scores (only approved results)
    const studentTotals = await this.aggregate([
      {
        $match: {
          className: className,
          term: term,
          session: session,
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$studentID',
          studentName: { $first: '$studentName' },
          totalScore: { $sum: '$total' },
          subjectCount: { $sum: 1 }
        }
      },
      {
        $addFields: {
          averageScore: { $divide: ['$totalScore', '$subjectCount'] }
        }
      },
      {
        $sort: { totalScore: -1, averageScore: -1 }
      }
    ]);

    // Assign positions
    for (let i = 0; i < studentTotals.length; i++) {
      const position = i + 1;
      await this.updateMany(
        {
          studentID: studentTotals[i]._id,
          className: className,
          term: term,
          session: session,
          status: 'approved'
        },
        { position: position }
      );
    }

    return studentTotals;
  } catch (error) {
    console.error('Error calculating positions:', error);
    throw error;
  }
};

// Compound indexes for efficient querying
resultSchema.index({ studentID: 1, term: 1, session: 1 });
resultSchema.index({ className: 1, subject: 1, term: 1, session: 1 });
resultSchema.index({ status: 1 });

module.exports = mongoose.model('Result', resultSchema);