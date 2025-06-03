const mongoose = require('mongoose');

const StrokeSchema = new mongoose.Schema({
  canvas: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canvas',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String
    required: true,
    ref: 'User',
    validate: {
      validator: function(v) {
        // Accept both ObjectId and guest_* string format
        return mongoose.Types.ObjectId.isValid(v) || 
               (typeof v === 'string' && v.startsWith('guest_'));
      },
      message: 'User must be either an ObjectId or a guest ID string'
    }
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
