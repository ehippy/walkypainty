// Canvas Module
const canvasModule = (() => {
  // DOM Elements
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const colorPicker = document.getElementById('colorPicker');
  const sizeSlider = document.getElementById('sizeSlider');
  const sizeValue = document.getElementById('sizeValue');
  const toolBtns = document.querySelectorAll('.tool-btn');
  const colorBtns = document.querySelectorAll('.color-btn');
  const clearBtn = document.getElementById('clearBtn');
  const saveBtn = document.getElementById('saveBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const saveModal = document.getElementById('saveModal');
  const closeModalBtn = document.querySelector('.close');
  const saveCanvasForm = document.getElementById('saveCanvasForm');
  const canvasList = document.getElementById('canvasList');
  const connectionStatus = document.getElementById('connectionStatus');
  const activeUsersCount = document.getElementById('activeUsersCount');

  // API URL
  const API_URL = '/api';

  // Socket connection
  let socket;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  // Canvas state
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let currentTool = 'brush';
  let currentColor = '#000000';
  let currentSize = 5;
  let currentCanvasId = null;
  let strokes = [];
  let currentStroke = {
    points: [],
    color: currentColor,
    width: currentSize,
    tool: currentTool
  };
  
  // Cursor indicators
  const cursorIndicators = new Map();

  // Initialize
  const init = () => {
    if (!canvas || !ctx) {
      console.error('Canvas or context not found');
      return;
    }
    
    // Initial canvas setup
    resizeCanvas();
    
    // Set initial states
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    
    // Event listeners for window/document
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('beforeunload', saveCanvasState);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Event listeners for tools
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => setTool(btn.dataset.tool));
    });

    // Event listeners for colors
    colorPicker.addEventListener('change', () => setColor(colorPicker.value));
    colorBtns.forEach(btn => {
      btn.addEventListener('click', () => setColor(btn.dataset.color));
    });

    // Event listener for size
    sizeSlider.addEventListener('input', () => setSize(sizeSlider.value));

    // Event listeners for drawing
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);

    // Action buttons
    clearBtn.addEventListener('click', clearCanvas);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Add toggle toolbar functionality
    const toggleToolbarBtn = document.querySelector('.toggle-toolbar');
    const toolbarContent = document.querySelector('.toolbar-content');
    
    if (toggleToolbarBtn && toolbarContent) {
      toggleToolbarBtn.addEventListener('click', () => {
        toolbarContent.classList.toggle('active');
      });
    }

    // Initialize socket connection
    initSocket();
    
    // Set initial connection status
    updateConnectionStatus(false);
  };

  // Save canvas before resize or unload
  const saveCanvasState = () => {
    canvas.savedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  // Resize canvas to fit container
  const resizeCanvas = () => {
    // Save current canvas state
    if (canvas.width > 0 && canvas.height > 0) {
      saveCanvasState();
    }
    
    // Get container dimensions
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Set canvas resolution to match container size
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Set display size (this affects the visible size)
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    // Restore saved content after resizing
    if (canvas.savedImageData) {
      // Create a temporary canvas to handle the resize
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.savedImageData.width;
      tempCanvas.height = canvas.savedImageData.height;
      tempCtx.putImageData(canvas.savedImageData, 0, 0);
      
      // Draw the temp canvas onto the resized canvas
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    }
    
    // Set up drawing context defaults
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };
  
  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    const canvasContainer = canvas.parentElement;
    
    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (canvasContainer.requestFullscreen) {
        canvasContainer.requestFullscreen();
      } else if (canvasContainer.webkitRequestFullscreen) { /* Safari */
        canvasContainer.webkitRequestFullscreen();
      } else if (canvasContainer.msRequestFullscreen) { /* IE11 */
        canvasContainer.msRequestFullscreen();
      }
      fullscreenBtn.textContent = 'Exit Fullscreen';
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
      }
      fullscreenBtn.textContent = 'Fullscreen';
    }
    
    // Resize canvas after a short delay to ensure fullscreen transition is complete
    setTimeout(resizeCanvas, 100);
  };
  
  // Handle fullscreen change event
  const handleFullscreenChange = () => {
    if (!document.fullscreenElement) {
      fullscreenBtn.textContent = 'Fullscreen';
    } else {
      fullscreenBtn.textContent = 'Exit Fullscreen';
    }
    // Resize canvas to fit the new container size
    setTimeout(resizeCanvas, 100);
  };

  // Set current tool
  const setTool = (tool) => {
    currentTool = tool;
    
    // Update UI
    toolBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
  };

  // Set current color
  const setColor = (color) => {
    currentColor = color;
    colorPicker.value = color;
    
    // Update UI
    colorBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
  };

  // Set brush size
  const setSize = (size) => {
    currentSize = size;
    sizeValue.textContent = `${size}px`;
  };

  // Mouse and touch event handlers
  const startDrawing = (e) => {
    e.preventDefault();
    isDrawing = true;
    
    // Get initial coordinates
    const { x, y } = getEventCoordinates(e);
    
    // Reset last coordinates to start a fresh stroke
    lastX = x;
    lastY = y;
    
    // Initialize new stroke
    currentStroke = {
        tool: currentTool,
        color: currentColor,
        size: currentSize,
        points: [{ x, y }]
    };
};

const handleMouseMove = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const { x, y } = getEventCoordinates(e);
    
    // Skip if coordinates are invalid
    if (isNaN(x) || isNaN(y)) return;
    
    // Draw based on current tool
    switch (currentTool) {
        case 'brush':
            drawBrush(x, y);
            break;
        // Add other tools here as needed
    }
    
    // Emit drawing data to other users
    if (socket && socket.connected) {
        socket.emit('draw', {
            x,
            y,
            lastX,
            lastY,
            color: currentColor,
            size: currentSize,
            tool: currentTool,
            canvasId: currentCanvasId || 'default'
        });
    }
    
    // Update last coordinates
    lastX = x;
    lastY = y;
};

const stopDrawing = () => {
    if (!isDrawing) return;
    
    isDrawing = false;
    // Reset coordinates for next stroke
    lastX = undefined;
    lastY = undefined;
    
    // Save stroke if needed
    if (currentStroke && currentStroke.points.length > 0) {
        strokes.push(currentStroke);
        currentStroke = null;
    }
};

// Touch events for mobile
const handleTouchStart = (e) => {
    e.preventDefault();
    
    // Adjust for scrolling and zooming
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Start drawing directly without creating a MouseEvent
    isDrawing = true;
    lastX = x;
    lastY = y;
    
    // Start a new stroke
    currentStroke = {
      points: [{ x, y }],
      color: currentColor,
      width: currentSize,
      tool: currentTool
    };
    
    // For some tools, draw a dot at the starting point
    if (currentTool !== 'eraser') {
      ctx.beginPath();
      ctx.fillStyle = currentColor;
      ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    e.preventDefault();
    
    if (!isDrawing) return;
    
    // Get touch coordinates
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Add point to current stroke
    currentStroke.points.push({ x, y });
    
    // Draw based on selected tool
    switch (currentTool) {
      case 'brush':
        drawBrush(x, y);
        break;
      case 'pencil':
        drawPencil(x, y);
        break;
      case 'eraser':
        erase(x, y);
        break;
      case 'spray':
        drawSpray(x, y);
        break;
    }
    
    // Emit drawing data
    if (socket && socket.connected) {
      socket.emit('draw', {
        x,
        y,
        lastX,
        lastY,
        color: currentColor,
        size: currentSize,
        tool: currentTool,
        canvasId: currentCanvasId || 'default'
      });
    }
    
    // Update last position
    lastX = x;
    lastY = y;
  };

  // Handle touch end
  const handleTouchEnd = (e) => {
    e.preventDefault();
    stopDrawing();
  };

  // Clear canvas
  const clearCanvas = () => {
    if (confirm('Are you sure you want to clear the canvas?')) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Emit clear event to server
      if (socket) {
        socket.emit('clear', { canvasId: currentCanvasId || 'default' });
      }
    }
  };

  // Open save modal
  const openSaveModal = () => {
    if (!authModule.isLoggedIn()) {
      alert('You need to be logged in to save canvases');
      return;
    }
    
    saveModal.style.display = 'flex';
  };

  // Close save modal
  const closeSaveModal = () => {
    saveModal.style.display = 'none';
    saveCanvasForm.reset();
  };

  // Save canvas
  const saveCanvas = async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('canvasName').value;
    const isPublic = document.getElementById('isPublic').checked;
    
    // Get canvas data URL
    const imageData = canvas.toDataURL('image/png');
    
    try {
      const response = await fetch(`${API_URL}/canvas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authModule.getToken()}`
        },
        body: JSON.stringify({
          name,
          imageData,
          isPublic
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save canvas');
      }
      
      // Update canvas ID
      currentCanvasId = data.data._id;
      
      // Close modal
      closeSaveModal();
      
      // Reload canvas list
      loadCanvasList();
      
      alert('Canvas saved successfully!');
    } catch (error) {
      alert(error.message);
    }
  };

  // Save stroke to server
  const saveStroke = async () => {
    if (!currentCanvasId) return;
    
    try {
      await fetch(`${API_URL}/strokes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authModule.getToken()}`
        },
        body: JSON.stringify({
          canvas: currentCanvasId,
          points: currentStroke.points,
          color: currentStroke.color,
          width: currentStroke.width,
          tool: currentStroke.tool
        })
      });
    } catch (error) {
      console.error('Error saving stroke:', error);
    }
  };

  // Load canvas list
  const loadCanvasList = async () => {
    try {
      const response = await fetch(`${API_URL}/canvas?public=true`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load canvases');
      }
      
      // Render canvas list
      renderCanvasList(data.data);
    } catch (error) {
      console.error('Error loading canvas list:', error);
    }
  };

  // Render canvas list
  const renderCanvasList = (canvases) => {
    canvasList.innerHTML = '';
    
    if (canvases.length === 0) {
      canvasList.innerHTML = '<p>No canvases found</p>';
      return;
    }
    
    canvases.forEach(canvas => {
      const canvasItem = document.createElement('div');
      canvasItem.className = 'canvas-item';
      canvasItem.dataset.id = canvas._id;
      
      const img = document.createElement('img');
      img.src = canvas.imageData;
      img.alt = canvas.name;
      
      const title = document.createElement('h3');
      title.textContent = canvas.name;
      
      const creator = document.createElement('p');
      creator.textContent = `Created by: ${canvas.creator.username}`;
      
      canvasItem.appendChild(img);
      canvasItem.appendChild(title);
      canvasItem.appendChild(creator);
      
      // Add click event to load canvas
      canvasItem.addEventListener('click', () => loadCanvas(canvas._id));
      
      canvasList.appendChild(canvasItem);
    });
  };

  // Load canvas
  const loadCanvas = async (canvasId) => {
    try {
      // Get canvas data
      const response = await fetch(`${API_URL}/canvas/${canvasId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load canvas');
      }
      
      // Clear current canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Load image data
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = data.data.imageData;
      
      // Set current canvas ID
      currentCanvasId = canvasId;
      
      // Join canvas room via socket
      if (socket) {
        socket.emit('joinCanvas', { canvasId });
      }
      
      // Load strokes
      loadStrokes(canvasId);
    } catch (error) {
      console.error('Error loading canvas:', error);
    }
  };

  // Load strokes for a canvas
  const loadStrokes = async (canvasId) => {
    try {
      const response = await fetch(`${API_URL}/strokes/${canvasId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load strokes');
      }
      
      // TODO: Replay strokes animation if needed
    } catch (error) {
      console.error('Error loading strokes:', error);
    }
  };

  // Initialize socket connection
  const initSocket = () => {
    // Connect to the same host as the web page, with automatic reconnection
    socket = io({
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: reconnectDelay,
      transports: ['websocket', 'polling']
    });
    
    // Listen for drawing events from other users
    socket.on('draw', drawFromOtherUser);
    
    // Listen for clear events
    socket.on('clear', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    
    // Connect event - ensures we're connected to the server
    socket.on('connect', () => {
      console.log('Connected to server with ID:', socket.id);
      updateConnectionStatus(true);
      reconnectAttempts = 0;
      
      // Always join the default canvas in the simplified version
      socket.emit('joinCanvas', { 
        canvasId: 'default',
        username: authModule.getCurrentUser()?.username || 'Guest'
      });
    });
    
    // Disconnect event
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      updateConnectionStatus(false);
      
      // Clear all cursor indicators
      cursorIndicators.forEach((cursor, userId) => {
        removeCursorIndicator(userId);
      });
      
      // Attempt to reconnect if not intentional
      attemptReconnect();
    });
    
    // Active users count update
    socket.on('activeUsers', (data) => {
      activeUsersCount.textContent = data.count;
    });
    
    // Canvas users update
    socket.on('canvasUsers', (data) => {
      activeUsersCount.textContent = data.count;
    });
    
    // Cursor updates from other users
    socket.on('cursorUpdate', (data) => {
      const { userId, x, y, username } = data;
      
      // Don't show our own cursor
      if (userId !== socket.id) {
        createCursorIndicator(userId, username, x, y);
      }
    });
  };

  // Draw from other user's data
  const drawFromOtherUser = (data) => {
    const { x, y, lastX: remoteLastX, lastY: remoteLastY, color, size, tool } = data;
    
    // Save current context state
    const savedState = {
        color: currentColor,
        size: currentSize,
        tool: currentTool,
        lastX,
        lastY,
        isDrawing
    };
    
    // Set up context for remote drawing
    currentColor = color;
    currentSize = size;
    currentTool = tool;
    lastX = remoteLastX;
    lastY = remoteLastY;
    isDrawing = true;
    
    // Draw based on tool
    switch (tool) {
      case 'brush':
        drawBrush(x, y);
        break;
      case 'pencil':
        drawPencil(x, y);
        break;
      case 'eraser':
        erase(x, y);
        break;
      case 'spray':
        drawSpray(x, y);
        break;
    }
    
    // Restore previous state
    currentColor = savedState.color;
    currentSize = savedState.size;
    currentTool = savedState.tool;
    lastX = savedState.lastX;
    lastY = savedState.lastY;
    isDrawing = savedState.isDrawing;
  };

  // Emit drawing data to server
  const emitDrawingData = (data) => {
    if (socket) {
      socket.emit('draw', {
        ...data,
        canvasId: 'default'
      });
    }
  };

  // Connection status functions
  const updateConnectionStatus = (isConnected) => {
    if (isConnected) {
      connectionStatus.textContent = 'Online';
      connectionStatus.className = 'status-online';
    } else {
      connectionStatus.textContent = 'Offline';
      connectionStatus.className = 'status-offline';
    }
  };

  // Create cursor indicator for another user
  const createCursorIndicator = (userId, username, x, y, color = '#FF4500') => {
    if (cursorIndicators.has(userId)) {
      // Update existing cursor
      const cursor = cursorIndicators.get(userId);
      cursor.style.transform = `translate(${x}px, ${y}px)`;
      return;
    }
    
    // Create new cursor indicator
    const cursor = document.createElement('div');
    cursor.className = 'cursor-indicator';
    cursor.style.backgroundColor = color;
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    
    // Add to canvas container
    canvas.parentElement.appendChild(cursor);
    
    // Store in map
    cursorIndicators.set(userId, cursor);
  };

  // Remove cursor indicator
  const removeCursorIndicator = (userId) => {
    if (cursorIndicators.has(userId)) {
      const cursor = cursorIndicators.get(userId);
      cursor.remove();
      cursorIndicators.delete(userId);
    }
  };
  
  // Attempt to reconnect to the server
  const attemptReconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }
    
    reconnectAttempts++;
    console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
    
    setTimeout(() => {
      if (!socket.connected) {
        socket.connect();
      }
    }, reconnectDelay);
  };

  // Helper function to get coordinates from events
  const getEventCoordinates = (e) => {
    let x, y;
    
    // Get canvas bounds
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches && e.touches[0]) {
        // Touch event
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        // Mouse event
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }
    
    // Adjust for canvas scaling if any
    x = x * (canvas.width / rect.width);
    y = y * (canvas.height / rect.height);
    
    return { x, y };
  };

  // Draw functions
  const drawBrush = (x, y) => {
    if (!isDrawing || !ctx || typeof lastX === 'undefined' || typeof lastY === 'undefined') return;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    
    // Calculate distance between points
    const dx = x - lastX;
    const dy = y - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > currentSize * 2) {
        // If points are far apart, draw a straight line
        ctx.lineTo(x, y);
    } else {
        // For smoother curves when points are close
        const midPoint = {
            x: lastX + (x - lastX) * 0.5,
            y: lastY + (y - lastY) * 0.5
        };
        ctx.quadraticCurveTo(lastX, lastY, midPoint.x, midPoint.y);
    }
    
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.closePath();
};

// Drawing tool functions
const drawPencil = (x, y) => {
    if (!isDrawing || !ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize * 0.5; // Pencil is thinner than brush
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.closePath();
};

const erase = (x, y) => {
    if (!isDrawing || !ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#FFFFFF'; // White for eraser
    ctx.lineWidth = currentSize * 2; // Eraser is wider than brush
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.closePath();
};

const drawSpray = (x, y) => {
    if (!isDrawing || !ctx) return;
    
    const density = currentSize * 2;
    for (let i = 0; i < density; i++) {
        const offsetX = getRandomOffset(currentSize);
        const offsetY = getRandomOffset(currentSize);
        
        ctx.beginPath();
        ctx.fillStyle = currentColor;
        ctx.arc(x + offsetX, y + offsetY, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }
};

// Helper function for spray tool
const getRandomOffset = (radius) => {
    const r = radius * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    return r * Math.cos(theta);
};

// Public methods
return {
    init
  };
})();

// Export canvas module
window.canvasModule = canvasModule;
