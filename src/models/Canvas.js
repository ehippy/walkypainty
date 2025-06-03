const mongoose = require('mongoose');

const CanvasSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Canvas name is required'],
    trim: true
  },
  imageData: {
    type: String,
    required: [true, 'Canvas image data is required']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contributors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPublic: {
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

// Update the updatedAt field on save
CanvasSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Canvas', CanvasSchema);
