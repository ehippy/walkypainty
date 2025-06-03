const Stroke = require('../models/Stroke');
const Canvas = require('../models/Canvas');

// @desc    Create a new stroke
// @route   POST /api/strokes
// @access  Private
exports.createStroke = async (req, res) => {
  try {
    const { canvas: canvasId, points, color, width, tool } = req.body;

    // Validate required fields
    if (!points || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Points array is required and must not be empty'
      });
    }

    if (!canvasId) {
      return res.status(400).json({
        success: false,
        message: 'Canvas ID is required'
      });
    }

    // Validate user exists
    if (!req.user || (!req.user._id && !req.user.id)) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Get user ID - handle both registered and guest users
    const userId = req.user._id || req.user.id;

    let canvas;
    // Handle default canvas case
    if (canvasId === 'default') {
      try {
        canvas = await Canvas.findOne({ defaultCanvas: true });
        
        // Create default canvas if it doesn't exist
        if (!canvas) {
          canvas = await Canvas.create({
            name: 'Default Canvas',
            imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
            isPublic: true,
            defaultCanvas: true
          });
          console.log('Created new default canvas:', canvas._id);
        }
      } catch (error) {
        console.error('Error handling default canvas:', error);
        return res.status(500).json({
          success: false,
          message: 'Error handling default canvas',
          error: error.message
        });
      }
    } else {
      try {
        canvas = await Canvas.findById(canvasId);
      } catch (err) {
        console.error('Invalid canvas ID format:', err);
        return res.status(400).json({
          success: false,
          message: 'Invalid canvas ID format',
          error: err.message
        });
      }
    }

    if (!canvas) {
      return res.status(404).json({
        success: false,
        message: `Canvas not found with ID: ${canvasId}`
      });
    }

    try {
      // Create stroke
      const stroke = await Stroke.create({
        canvas: canvas._id,
        user: userId, // This will now accept both ObjectId and guest_* string formats
        points,
        color: color || '#000000',
        width: width || 5,
        tool: tool || 'brush'
      });

      // Only add to contributors if it's a registered user
      if (!canvas.defaultCanvas && canvas.contributors && mongoose.Types.ObjectId.isValid(userId)) {
        if (!canvas.contributors.includes(userId)) {
          canvas.contributors.push(userId);
          await canvas.save();
        }
      }

      res.status(201).json({
        success: true,
        data: stroke
      });
    } catch (error) {
      console.error('Error creating stroke:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creating stroke',
        error: error.message,
        details: error.errors // Include validation error details if any
      });
    }
  } catch (error) {
    console.error('Unexpected error in createStroke:', error);
    res.status(500).json({
      success: false,
      message: 'Unexpected error while creating stroke',
      error: error.message,
      details: error.errors // Include validation error details if any
    });
  }
};

// @desc    Get all strokes for a canvas
// @route   GET /api/strokes/:canvasId
// @access  Public/Private (depends on canvas visibility)
exports.getStrokes = async (req, res) => {
  try {
    const canvasId = req.params.canvasId;
    
    if (!canvasId) {
      return res.status(400).json({
        success: false,
        message: 'Canvas ID is required'
      });
    }

    let canvas;

    // Special handling for default canvas
    if (canvasId === 'default') {
      try {
        canvas = await Canvas.findOne({ defaultCanvas: true });
        if (!canvas) {
          console.log('Default canvas not found, creating...');
          canvas = await Canvas.create({
            name: 'Default Canvas',
            imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
            isPublic: true,
            defaultCanvas: true
          });
          console.log('Created new default canvas:', canvas._id);
        }
      } catch (error) {
        console.error('Error handling default canvas:', error);
        return res.status(500).json({
          success: false,
          message: 'Error handling default canvas',
          error: error.message
        });
      }
    } else {
      try {
        canvas = await Canvas.findById(canvasId);
      } catch (err) {
        console.error('Invalid canvas ID format:', err);
        return res.status(400).json({
          success: false,
          message: 'Invalid canvas ID format',
          error: err.message
        });
      }
    }

    if (!canvas) {
      return res.status(404).json({
        success: false,
        message: `Canvas not found with ID: ${canvasId}`
      });
    }

    // Check if canvas is private and user is not authorized
    if (
      !canvas.isPublic &&
      (!req.user || 
        (req.user._id !== canvas.creator?.toString() && 
         !canvas.contributors?.some(contributor => contributor.toString() === req.user._id)))
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this canvas'
      });
    }

    try {
      // Get strokes using the actual canvas _id
      const strokes = await Stroke.find({ canvas: canvas._id })
        .lean() // Convert to plain JS objects
        .exec();

      // Post-process the strokes to handle guest users
      const processedStrokes = strokes.map(stroke => {
        // If user is a string (guest_*), create a guest user object
        if (typeof stroke.user === 'string' && stroke.user.startsWith('guest_')) {
          return {
            ...stroke,
            user: {
              _id: stroke.user,
              username: `Guest ${stroke.user.split('_')[1]}`,
              avatar: 'default-avatar.png'
            }
          };
        }
        return stroke;
      });

      res.status(200).json({
        success: true,
        count: processedStrokes.length,
        data: processedStrokes
      });
    } catch (error) {
      console.error('Error fetching strokes:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching strokes',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Unexpected error in getStrokes:', error);
    res.status(500).json({
      success: false,
      message: 'Unexpected error while fetching strokes',
      error: error.message
    });
  }
};
