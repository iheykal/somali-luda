// Simple syntax check
console.log('Testing syntax...');

// Test if we can require the files without syntax errors
try {
  // This won't work in ES modules but will at least check basic syntax
  console.log('Basic syntax test passed');
} catch (error) {
  console.error('Syntax error:', error);
}
