const Canvas = require('../models/Canvas');
const Stroke = require('../models/Stroke');

// @desc    Create a new canvas
// @route   POST /api/canvas
// @access  Private
exports.createCanvas = async (req, res) => {
  try {
    const { name, imageData, isPublic } = req.body;

    const canvas = await Canvas.create({
      name,
      imageData: imageData || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Empty transparent image
      creator: req.user.id,
      contributors: [req.user.id],
      isPublic
    });

    res.status(201).json({
      success: true,
      data: canvas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all canvases
// @route   GET /api/canvas
// @access  Public
exports.getCanvases = async (req, res) => {
  try {
    let query = {};
    
    // If not public, only show user's canvases
    if (req.query.public === 'false' && req.user) {
      query = {
        $or: [
          { creator: req.user.id },
          { contributors: req.user.id },
          { isPublic: true }
        ]
      };
    } else {
      query = { isPublic: true };
    }

    const canvases = await Canvas.find(query)
      .populate('creator', 'username avatar')
      .populate('contributors', 'username avatar')
      .sort('-updatedAt');

    res.status(200).json({
      success: true,
      count: canvases.length,
      data: canvases
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single canvas
// @route   GET /api/canvas/:id
// @access  Public/Private (depends on canvas visibility)
exports.getCanvas = async (req, res) => {
  try {
    const canvas = await Canvas.findById(req.params.id)
      .populate('creator', 'username avatar')
      .populate('contributors', 'username avatar');

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
         !canvas.contributors.some(contributor => contributor._id.toString() === req.user.id)))
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this canvas'
      });
    }

    res.status(200).json({
      success: true,
      data: canvas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update canvas
// @route   PUT /api/canvas/:id
// @access  Private (only creator or contributors)
exports.updateCanvas = async (req, res) => {
  try {
    let canvas = await Canvas.findById(req.params.id);

    if (!canvas) {
      return res.status(404).json({
        success: false,
        message: 'Canvas not found'
      });
    }

    // Check if user is creator or contributor
    if (
      req.user.id !== canvas.creator.toString() &&
      !canvas.contributors.some(contributor => contributor.toString() === req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this canvas'
      });
    }

    // Update canvas
    canvas = await Canvas.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    // Add user to contributors if not already there
    if (!canvas.contributors.includes(req.user.id)) {
      canvas.contributors.push(req.user.id);
      await canvas.save();
    }

    res.status(200).json({
      success: true,
      data: canvas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete canvas
// @route   DELETE /api/canvas/:id
// @access  Private (only creator)
exports.deleteCanvas = async (req, res) => {
  try {
    const canvas = await Canvas.findById(req.params.id);

    if (!canvas) {
      return res.status(404).json({
        success: false,
        message: 'Canvas not found'
      });
    }

    // Check if user is creator
    if (req.user.id !== canvas.creator.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this canvas'
      });
    }

    // Delete all strokes associated with the canvas
    await Stroke.deleteMany({ canvas: req.params.id });

    // Delete canvas
    await canvas.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
