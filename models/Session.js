const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  currentTerm: {
    type: String,
    required: true,
    enum: ['First Term', 'Second Term', 'Third Term'],
    default: 'First Term'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  // Term dates
  firstTermStart: Date,
  firstTermEnd: Date,
  secondTermStart: Date,
  secondTermEnd: Date,
  thirdTermStart: Date,
  thirdTermEnd: Date,
  // Status tracking
  firstTermLocked: {
    type: Boolean,
    default: false
  },
  secondTermLocked: {
    type: Boolean,
    default: false
  },
  thirdTermLocked: {
    type: Boolean,
    default: false
  },
  sessionLocked: {
    type: Boolean,
    default: false
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

// Ensure only one active session
sessionSchema.pre('save', async function(next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  this.updatedAt = Date.now();
  next();
});

// Static method to get active session
sessionSchema.statics.getActiveSession = function() {
  return this.findOne({ isActive: true });
};

// Method to check if current term is locked
sessionSchema.methods.isCurrentTermLocked = function() {
  switch (this.currentTerm) {
    case 'First Term':
      return this.firstTermLocked;
    case 'Second Term':
      return this.secondTermLocked;
    case 'Third Term':
      return this.thirdTermLocked;
    default:
      return false;
  }
};

module.exports = mongoose.model('Session', sessionSchema);