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
    
    // Add username label
    const usernameLabel = document.createElement('div');
    usernameLabel.className = 'cursor-username';
    usernameLabel.textContent = username || 'Anonymous';
    cursor.appendChild(usernameLabel);
    
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

  // Initialize socket connection
  const initSocket = () => {
    socket = io();
    
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
      
      // If we have a specific canvas ID, join that room
      if (currentCanvasId) {
        socket.emit('joinCanvas', { 
          canvasId: currentCanvasId,
          username: authModule.getCurrentUser()?.username || 'Guest'
        });
      }
    });
    
    // Disconnect event
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      updateConnectionStatus(false);
      
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
