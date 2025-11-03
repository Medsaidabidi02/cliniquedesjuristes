/**
 * Bunny.net Storage Setup Script (TypeScript version)
 * 
 * This script tests the connection to Bunny.net storage and sets up
 * the required folder structure for the educational platform.
 * 
 * Usage: npx ts-node setup-bunny-storage.ts
 */

import bunnyStorage from './src/services/bunnyStorage';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env-1.production') });
dotenv.config(); // Also try .env if exists

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

  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    if (error.message.includes('BUNNY_STORAGE')) {
      console.error('\n💡 Tip: Make sure your .env file contains:');
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
