const fs = require('fs');

// Create a simple PNG file with base64 encoding
// This is a minimal 1x1 white pixel PNG
const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');

fs.writeFileSync('test-image.png', pngData);

console.log('Created test-image.png');