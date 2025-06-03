const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Import routes
const canvasRoutes = require('./routes/canvas');
const strokeRoutes = require('./routes/stroke');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for large canvas data
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Set static folder
app.use(express.static(path.join(__dirname, '../public')));

// Mount routes
app.use('/api/canvas', canvasRoutes);
app.use('/api/strokes', strokeRoutes);

// Define routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the WalkyPainty API' });
});

// In the simplified version, we don't need authentication or persistent storage
app.use((req, res, next) => {
  req.user = {
    _id: `guest_${Math.floor(Math.random() * 1000000)}`,
    username: `Artist_${Math.floor(Math.random() * 10000)}`,
    role: 'guest'
  };
  next();
});

// Track active users
const activeUsers = new Map();

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  // Generate a random username for this socket
  const username = `Artist_${Math.floor(Math.random() * 10000)}`;
  
  // Add user to default room
  socket.join('default');
  console.log(`Client ${socket.id} joined default room`);
  
  // Add user to active users
  activeUsers.set(socket.id, {
    id: socket.id,
    room: 'default',
    username: username,
    cursorPosition: { x: 0, y: 0 }
  });
  
  // Emit updated user count to all clients
  io.emit('activeUsers', {
    count: activeUsers.size,
    users: Array.from(activeUsers.values())
  });
  
  // Listen for drawing data
  socket.on('draw', (data) => {
    // Broadcast to the default room
    socket.to('default').emit('draw', data);
  });
  
  // Listen for cursor movement
  socket.on('cursorMove', ({ x, y }) => {
    // Update cursor position for this user
    const user = activeUsers.get(socket.id);
    if (user) {
      user.cursorPosition = { x, y };
      activeUsers.set(socket.id, user);
      
      // Emit to the default room
      socket.to('default').emit('cursorUpdate', {
        userId: socket.id,
        x, y,
        username: user.username
      });
    }
  });
  
  // Listen for canvas clear
  socket.on('clear', () => {
    socket.to('default').emit('clear');
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Get user's room before removing
    const user = activeUsers.get(socket.id);
    const room = user ? user.room : null;
    
    // Remove from active users
    activeUsers.delete(socket.id);
    
    // Emit updated user count to all clients
    io.emit('activeUsers', {
      count: activeUsers.size,
      users: Array.from(activeUsers.values())
    });
  });
});

// Middleware that creates a guest user for all requests
const guestMiddleware = (req, res, next) => {
  // Create a guest user with a random ID
  req.user = {
    _id: `guest_${Math.floor(Math.random() * 1000000)}`,
    username: `Artist_${Math.floor(Math.random() * 10000)}`,
    role: 'guest'
  };
  
  next();
};

// Use guest middleware for all routes
app.use(guestMiddleware);

// Connect to MongoDB
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/walkypainty';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
  });
