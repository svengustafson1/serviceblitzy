const fs = require('fs');
const path = require('path');

// Ensure images directory exists
const imagesDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Create a basic SVG placeholder
const createSvgPlaceholder = (filename, width, height, text) => {
  // Create with proper .svg extension
  const svgFilename = filename.replace(/\.[^/.]+$/, '.svg');
  
  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f0f0"/>
  <text x="50%" y="50%" font-family="Arial" font-size="24" text-anchor="middle" dominant-baseline="middle" fill="#666">${text}</text>
</svg>
  `.trim();

  fs.writeFileSync(path.join(imagesDir, svgFilename), svg);
  console.log(`Created ${svgFilename}`);
};

// Create placeholder images
createSvgPlaceholder('hero-image.svg', 800, 600, 'Hero Image');
createSvgPlaceholder('benefits-image.svg', 600, 450, 'Benefits Image');
createSvgPlaceholder('property-placeholder.svg', 800, 600, 'Property Image');

console.log('All placeholder images created successfully.'); 