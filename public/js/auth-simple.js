// filepath: /Users/pmcdavid/Documents/walkypainty/public/js/auth.js
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
