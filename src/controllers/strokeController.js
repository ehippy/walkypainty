const Stroke = require('../models/Stroke');
const Canvas = require('../models/Canvas');

// @desc    Create a new stroke
// @route   POST /api/strokes
// @access  Private
exports.createStroke = async (req, res) => {
  try {
    const { canvas: canvasId, points, color, width, tool } = req.body;

    // Check if canvas exists
    const canvas = await Canvas.findById(canvasId);

    if (!canvas) {
      return res.status(404).json({
        success: false,
        message: 'Canvas not found'
      });
    }

    // Create stroke
    const stroke = await Stroke.create({
      canvas: canvasId,
      user: req.user.id,
      points,
      color,
      width,
      tool
    });

    // Add user to canvas contributors if not already there
    if (!canvas.contributors.includes(req.user.id)) {
      canvas.contributors.push(req.user.id);
      await canvas.save();
    }

    res.status(201).json({
      success: true,
      data: stroke
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all strokes for a canvas
// @route   GET /api/strokes/:canvasId
// @access  Public/Private (depends on canvas visibility)
exports.getStrokes = async (req, res) => {
  try {
    const canvasId = req.params.canvasId;

    // Check if canvas exists
    const canvas = await Canvas.findById(canvasId);

    if (!canvas) {
      return res.status(404).json({
        success: false,
        message: 'Canvas not found'
      });
    }

    // Check if canvas is private and user is not the creator or a contributor
    if (
      !canvas.isPublic &&
      (!req.user || 
        (req.user.id !== canvas.creator.toString() && 
         !canvas.contributors.some(contributor => contributor.toString() === req.user.id)))
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this canvas'
      });
    }

    // Get strokes
    const strokes = await Stroke.find({ canvas: canvasId })
      .populate('user', 'username avatar')
      .sort('timestamp');

    res.status(200).json({
      success: true,
      count: strokes.length,
      data: strokes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
