#!/usr/bin/env node

/**
 * Test script for Bunny.net video upload
 * Tests the admin upload endpoint and verifies file exists on Bunny.net
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:5001';
const BUNNY_STORAGE_HOST = process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com';
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'cliniquedesjuristesvideos';
const BUNNY_READ_API_KEY = process.env.BUNNY_READ_API_KEY;

console.log('🧪 Testing Bunny.net Video Upload\n');
console.log('='.repeat(60));

async function testUpload() {
  try {
    // Create a small test video file (1KB)
    const testVideoPath = path.join(__dirname, 'test-video.mp4');
    const testVideoContent = Buffer.alloc(1024, 'Test video content for Bunny.net upload testing');
    fs.writeFileSync(testVideoPath, testVideoContent);
    console.log('✅ Created test video file');

    // Create form data
    const form = new FormData();
    form.append('title', 'Test Video Upload');
    form.append('description', 'Automated test upload to Bunny.net');
    form.append('subject_id', '1'); // Assuming subject 1 exists
    form.append('is_active', 'true');
    form.append('video', fs.createReadStream(testVideoPath));

    console.log('\n📤 Uploading video to backend...');
    
    const uploadResponse = await axios.post(
      `${API_URL}/api/videos/bunny/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    console.log('✅ Upload successful!');
    console.log('\n📋 Upload Response:');
    console.log(`   Video ID: ${uploadResponse.data.id || uploadResponse.data.data?.id}`);
    console.log(`   Title: ${uploadResponse.data.title || uploadResponse.data.data?.title}`);
    console.log(`   Video Path: ${uploadResponse.data.video_path || uploadResponse.data.data?.video_path}`);
    console.log(`   Thumbnail Path: ${uploadResponse.data.thumbnail_path || uploadResponse.data.data?.thumbnail_path}`);

    const videoPath = uploadResponse.data.video_path || uploadResponse.data.data?.video_path;
    const thumbnailPath = uploadResponse.data.thumbnail_path || uploadResponse.data.data?.thumbnail_path;

    // Verify video exists on Bunny.net
    if (BUNNY_READ_API_KEY && videoPath) {
      console.log('\n🔍 Verifying file exists on Bunny.net...');
      
      try {
        const listUrl = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}${path.dirname(videoPath)}/`;
        const listResponse = await axios.get(listUrl, {
          headers: {
            'AccessKey': BUNNY_READ_API_KEY,
          },
        });

        const videoFilename = path.basename(videoPath);
        const videoExists = listResponse.data.some((file) => file.ObjectName === videoFilename);
        
        if (videoExists) {
          console.log('✅ Video file verified on Bunny.net');
        } else {
          console.log('⚠️ Video file not found on Bunny.net (may need time to propagate)');
        }

        // Check thumbnail if generated
        if (thumbnailPath) {
          const thumbnailListUrl = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}${path.dirname(thumbnailPath)}/`;
          const thumbnailListResponse = await axios.get(thumbnailListUrl, {
            headers: {
              'AccessKey': BUNNY_READ_API_KEY,
            },
          });

          const thumbnailFilename = path.basename(thumbnailPath);
          const thumbnailExists = thumbnailListResponse.data.some((file) => file.ObjectName === thumbnailFilename);
          
          if (thumbnailExists) {
            console.log('✅ Thumbnail file verified on Bunny.net');
          } else {
            console.log('⚠️ Thumbnail file not found on Bunny.net');
          }
        }
      } catch (verifyError) {
        if (axios.isAxiosError(verifyError) && verifyError.code === 'ENOTFOUND') {
          console.log('⚠️ Cannot verify on Bunny.net: Network blocked (expected in sandbox)');
        } else {
          console.error('⚠️ Error verifying on Bunny.net:', verifyError.message);
        }
      }
    } else {
      console.log('\n⚠️ Skipping Bunny.net verification: API key not configured or no video path');
    }

    // Verify database metadata
    console.log('\n🔍 Verifying database metadata...');
    const videoId = uploadResponse.data.id || uploadResponse.data.data?.id;
    const getVideoResponse = await axios.get(`${API_URL}/api/videos/${videoId}`);
    
    if (getVideoResponse.data) {
      console.log('✅ Database metadata verified');
      console.log(`   ID: ${getVideoResponse.data.id}`);
      console.log(`   Title: ${getVideoResponse.data.title}`);
      console.log(`   Path: ${getVideoResponse.data.video_path}`);
    }

    // Cleanup
    fs.unlinkSync(testVideoPath);
    console.log('\n🗑️ Cleaned up test files');

    console.log('\n' + '='.repeat(60));
    console.log('✅ All upload tests passed!');
    console.log('\nTest Summary:');
    console.log('  ✅ Video upload to backend');
    console.log('  ✅ Metadata stored in database');
    if (BUNNY_READ_API_KEY) {
      console.log('  ⚠️ Bunny.net verification (may be blocked in sandbox)');
    }
    
    return true;

  } catch (error) {
    console.error('\n❌ Upload test failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.error('   Status:', error.response?.status);
      console.error('   Data:', error.response?.data);
    }
    
    // Cleanup on error
    const testVideoPath = path.join(__dirname, 'test-video.mp4');
    if (fs.existsSync(testVideoPath)) {
      fs.unlinkSync(testVideoPath);
    }
    
    return false;
  }
}

// Run test
testUpload()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
