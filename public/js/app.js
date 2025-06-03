// Initialize the canvas module when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.canvasModule !== 'undefined') {
    window.canvasModule.init();
  } else {
    console.error('Canvas module not loaded');
  }
});
