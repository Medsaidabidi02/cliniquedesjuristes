/**
 * Bunny.net Storage Setup Script
 * 
 * This script tests the connection to Bunny.net storage and sets up
 * the required folder structure for the educational platform.
 * 
 * Usage:
 *   1. First build the backend: npm run build
 *   2. Then run this script: node setup-bunny-storage.js
 * 
 * Alternative (without building):
 *   npx ts-node setup-bunny-storage.ts
 */

// Check if dist directory exists
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Error: Backend has not been built yet.\n');
  console.error('Please run the following commands first:');
  console.error('  1. npm install');
  console.error('  2. npm run build');
  console.error('  3. node setup-bunny-storage.js\n');
  console.error('Alternatively, you can run directly with TypeScript:');
  console.error('  npx ts-node setup-bunny-storage.ts\n');
  process.exit(1);
}

// Load environment variables from .env files
require('dotenv').config({ path: path.join(__dirname, '.env-1.production') });
require('dotenv').config(); // Also try .env if it exists

const bunnyStorage = require('./dist/services/bunnyStorage').default;

async function setupBunnyStorage() {
  console.log('🚀 Starting Bunny.net Storage Setup...\n');

  try {
    // Test connection
    console.log('1️⃣ Testing Bunny.net connection...');
    const connected = await bunnyStorage.testConnection();
    
    if (!connected) {
      console.error('❌ Connection test failed. Please check your credentials in .env file.');
      process.exit(1);
    }
    
    console.log('✅ Connection successful!\n');

    // Setup folder structure
    console.log('2️⃣ Setting up folder structure...');
    await bunnyStorage.setupFolderStructure();
    
    console.log('\n✅ Folder structure setup complete!\n');

    // Display the folder structure
    console.log('📁 Bunny.net Storage Folder Structure:');
    console.log('   ├── /videos/');
    console.log('   │   ├── /course-{id}/');
    console.log('   │   │   └── {video-filename}.mp4');
    console.log('   │   └── /general/');
    console.log('   │       └── {video-filename}.mp4');
    console.log('   ├── /thumbnails/');
    console.log('   │   ├── /course-{id}/');
    console.log('   │   │   └── {thumbnail-filename}.jpg');
    console.log('   │   └── /general/');
    console.log('   │       └── {thumbnail-filename}.jpg');
    console.log('   ├── /materials/');
    console.log('   │   └── {material-filename}.pdf');
    console.log('   ├── /blog/');
    console.log('   │   └── {blog-image-filename}.jpg');
    console.log('   └── /images/');
    console.log('       └── {image-filename}.jpg\n');

    console.log('🎉 Bunny.net Storage is ready to use!\n');
    console.log('📌 CDN URL: https://cliniquedesjuristesvideos.b-cdn.net');
    console.log('📌 Example video URL: https://cliniquedesjuristesvideos.b-cdn.net/videos/course-1/video.mp4');
    console.log('📌 Example thumbnail URL: https://cliniquedesjuristesvideos.b-cdn.net/thumbnails/course-1/thumb.jpg\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    if (error.message.includes('BUNNY_STORAGE')) {
      console.error('\n💡 Tip: Make sure your .env-1.production or .env file contains:');
      console.error('   BUNNY_STORAGE_HOSTNAME=storage.bunnycdn.com');
      console.error('   BUNNY_STORAGE_USERNAME=cliniquedesjuristesvideos');
      console.error('   BUNNY_STORAGE_PASSWORD=your-password');
      console.error('   BUNNY_STORAGE_PORT=21\n');
    }
    process.exit(1);
  }
}

// Run the setup
setupBunnyStorage();
