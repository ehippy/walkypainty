const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes that require authentication
exports.protect = async (req, res, next) => {
  // Skip authentication - allow all requests as guest
  if (!req.user) {
    // Create a guest user if one doesn't exist
    req.user = {
      _id: `guest_${Math.floor(Math.random() * 1000000)}`,
      username: `Artist_${Math.floor(Math.random() * 10000)}`,
      role: 'guest'
    };
  }
  
  next();
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Always allow guest role
    if (roles.includes('guest') || roles.includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: `User role ${req.user.role} is not authorized to access this route`
    });
  };
};
