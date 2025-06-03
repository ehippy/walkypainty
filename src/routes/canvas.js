const express = require('express');
const router = express.Router();
const {
  createCanvas,
  getCanvases,
  getCanvas,
  updateCanvas,
  deleteCanvas
} = require('../controllers/canvasController');
const { protect } = require('../middleware/auth');

// Routes for /api/canvas
router.route('/')
  .get(getCanvases)
  .post(protect, createCanvas);

router.route('/:id')
  .get(getCanvas)
  .put(protect, updateCanvas)
  .delete(protect, deleteCanvas);

module.exports = router;
