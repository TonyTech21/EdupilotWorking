const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  motto: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  logo: {
    type: String,
    default: '/images/default-logo.png'
  },
  mission: {
    type: String,
    trim: true
  },
  vision: {
    type: String,
    trim: true
  },
  about: {
    type: String,
    trim: true
  },
  gallery: [{
    imageUrl: String,
    caption: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  principalName: {
    type: String,
    trim: true
  },
  principalMessage: {
    type: String,
    trim: true
  },
  establishedYear: {
    type: Number
  },
  accreditation: {
    type: String,
    trim: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
schoolSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('School', schoolSchema);