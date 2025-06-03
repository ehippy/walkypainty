const express = require('express');
const router = express.Router();
const {
  createStroke,
  getStrokes
} = require('../controllers/strokeController');
const { protect } = require('../middleware/auth');

// Routes for /api/strokes
router.route('/')
  .post(protect, createStroke);

router.route('/:canvasId')
  .get(getStrokes);

module.exports = router;
