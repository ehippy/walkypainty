// Authentication Module (Simplified for guest-only mode)
const authModule = (() => {
  // State
  let currentUser = { username: `Artist_${Math.floor(Math.random() * 10000)}` };
  
  // Initialize
  const init = () => {
    // Skip authentication, everyone is a guest
    console.log('Guest mode active: ', currentUser.username);
  };

  // Public methods and properties
  return {
    init,
    getToken: () => null, // No tokens needed for guest mode
    getCurrentUser: () => currentUser,
    isLoggedIn: () => false // Always report as not logged in (guest mode)
  };
})();

// Initialize auth module when DOM is loaded
document.addEventListener('DOMContentLoaded', authModule.init);

  // Switch between login and register tabs
  const switchTab = (tab) => {
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.querySelectorAll('.auth-form').forEach(form => {
      form.classList.remove('active');
    });

    if (tab === 'login') {
      loginForm.classList.add('active');
    } else {
      registerForm.classList.add('active');
    }
  };

  // Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save token and user data
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('token', token);
      
      // Update UI
      updateUserInfo();
      closeAuthOverlay();
      
      // Reset form
      loginForm.reset();
    } catch (error) {
      alert(error.message);
    }
  };

  // Handle register form submission
  const handleRegister = async (e) => {
    e.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    // Validate password match
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Save token and user data
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('token', token);
      
      // Update UI
      updateUserInfo();
      closeAuthOverlay();
      
      // Reset form
      registerForm.reset();
    } catch (error) {
      alert(error.message);
    }
  };

  // Handle guest login
  const handleGuestLogin = (e) => {
    e.preventDefault();
    
    // Set guest user
    currentUser = { username: 'Guest' };
    
    // Update UI
    updateUserInfo();
    closeAuthOverlay();
  };

  // Handle logout
  const handleLogout = () => {
    // Clear token and user data
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    
    // Show auth overlay
    authOverlay.style.display = 'flex';
    
    // Update UI
    updateUserInfo();
  };

  // Get user data from API
  const getUserData = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get user data');
      }

      const data = await response.json();
      currentUser = data.user;
      
      // Update UI
      updateUserInfo();
      closeAuthOverlay();
    } catch (error) {
      // Clear invalid token
      token = null;
      localStorage.removeItem('token');
    }
  };

  // Update user info in UI
  const updateUserInfo = () => {
    if (currentUser) {
      usernameElement.textContent = currentUser.username;
      userInfoElement.style.display = 'flex';
    } else {
      usernameElement.textContent = 'Guest';
      userInfoElement.style.display = 'none';
    }
  };

  // Close auth overlay
  const closeAuthOverlay = () => {
    authOverlay.style.display = 'none';
  };

  // Public methods and properties
  return {
    init,
    getToken: () => token,
    getCurrentUser: () => currentUser,
    isLoggedIn: () => !!currentUser && !!token
  };
})();

// Initialize auth module when DOM is loaded
document.addEventListener('DOMContentLoaded', authModule.init);
