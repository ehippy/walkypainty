const mongoose = require('mongoose');

const StrokeSchema = new mongoose.Schema({
  canvas: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canvas',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  points: [{
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    }
  }],
  color: {
    type: String,
    default: '#000000'
  },
  width: {
    type: Number,
    default: 5
  },
  tool: {
    type: String,
    enum: ['brush', 'pencil', 'eraser', 'spray'],
    default: 'brush'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Stroke', StrokeSchema);
