// This script downloads stock images from Unsplash for the demo

const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

// Images to download
const imagesToDownload = [
  {
    url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=2070&auto=format&fit=crop',
    filename: 'hero-image.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2070&auto=format&fit=crop',
    filename: 'benefits-image.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop',
    filename: 'lawn-care.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop',
    filename: 'cleaning.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1521783988139-89397d761dce?w=600&auto=format&fit=crop',
    filename: 'exterior-maintenance.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1542769494-0cc077e7909a?w=600&auto=format&fit=crop',
    filename: 'hvac.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop',
    filename: 'property-placeholder-1.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=600&auto=format&fit=crop',
    filename: 'property-placeholder-2.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&auto=format&fit=crop',
    filename: 'gardening.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop',
    filename: 'waterfront.jpg',
  },
  // Provider avatars - using different URLs that should work
  {
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop',
    filename: 'providers/provider-1.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop',
    filename: 'providers/provider-2.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&auto=format&fit=crop',
    filename: 'providers/provider-3.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=300&auto=format&fit=crop',
    filename: 'providers/provider-4.jpg',
  },
  {
    url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=300&auto=format&fit=crop',
    filename: 'providers/provider-5.jpg',
  },
];

// Function to download an image
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image. Status code: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded: ${filepath}`);
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete the file if there was an error
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Main function to download all images
async function downloadAllImages() {
  const publicDir = path.join(__dirname, 'public');
  const imagesDir = path.join(publicDir, 'images');

  // Create the directories if they don't exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
  }

  const imageUrls = {
    'hero-image.jpg': 'https://images.unsplash.com/photo-1560520031-3a4dc4e9de0c?w=1200',
    'benefits-image.jpg': 'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?w=800',
    'provider1.jpg': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    'provider2.jpg': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200',
    'provider3.jpg': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    'provider4.jpg': 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200',
    'property-placeholder.jpg': 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600',
    'property-example1.jpg': 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600',
    'property-example2.jpg': 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600',
    'property-example3.jpg': 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=600',
    'avatar-placeholder.jpg': 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100',
    // Service category images
    'lawn-care.jpg': 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=800',
    'cleaning.jpg': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
    'exterior-maintenance.jpg': 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
    'hvac.jpg': 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800',
    'gardening.jpg': 'https://images.unsplash.com/photo-1599629954294-16ca7bd010ab?w=800',
    'waterfront.jpg': 'https://images.unsplash.com/photo-1536599018102-9f6700e1438c?w=800',
  };

  let downloadCount = 0;
  for (const [filename, url] of Object.entries(imageUrls)) {
    const filepath = path.join(imagesDir, filename);
    
    // Skip if the file already exists
    if (fs.existsSync(filepath)) {
      console.log(`File already exists: ${filepath}`);
      continue;
    }
    
    try {
      await downloadImage(url, filepath);
      downloadCount++;
    } catch (error) {
      console.error(`Error downloading ${filename}: ${error.message}`);
    }
  }

  console.log(`Successfully downloaded ${downloadCount} images.`);
}

// Run the download function
downloadAllImages().catch(console.error); 