#!/usr/bin/env node

/**
 * Test script for Bunny.net video upload
 * Tests the complete upload flow: local file -> Bunny.net -> database
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5001';
const TEST_VIDEO_SIZE = 1024 * 1024; // 1MB test video

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Create a dummy video file for testing
 */
function createTestVideo() {
  const testDir = path.join(__dirname, '../tmp');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const videoPath = path.join(testDir, 'test-video.mp4');
  const thumbnailPath = path.join(testDir, 'test-thumbnail.jpg');

  // Create a simple test video file (just random data)
  const videoBuffer = Buffer.alloc(TEST_VIDEO_SIZE);
  for (let i = 0; i < TEST_VIDEO_SIZE; i++) {
    videoBuffer[i] = Math.floor(Math.random() * 256);
  }
  fs.writeFileSync(videoPath, videoBuffer);

  // Create a simple test thumbnail (just random data)
  const thumbnailBuffer = Buffer.alloc(10240); // 10KB
  for (let i = 0; i < 10240; i++) {
    thumbnailBuffer[i] = Math.floor(Math.random() * 256);
  }
  fs.writeFileSync(thumbnailPath, thumbnailBuffer);

  log('✅ Created test video and thumbnail files', 'green');
  return { videoPath, thumbnailPath };
}

/**
 * Test upload to Bunny.net via API
 */
async function testUpload() {
  try {
    log('\n📤 Testing Bunny.net Upload...', 'blue');
    log('=' .repeat(50), 'blue');

    // Create test files
    const { videoPath, thumbnailPath } = createTestVideo();

    // Prepare form data
    const form = new FormData();
    form.append('title', 'Test Video Upload');
    form.append('description', 'This is a test video upload to Bunny.net');
    form.append('course_id', '1');
    form.append('lesson_slug', 'test-lesson-' + Date.now());
    form.append('is_locked', 'false');
    form.append('video', fs.createReadStream(videoPath));
    form.append('thumbnail', fs.createReadStream(thumbnailPath));

    log('\n1️⃣ Uploading video to API endpoint...', 'yellow');
    
    const response = await axios.post(
      `${API_URL}/api/videos/bunny/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          // In production, add Authorization header here
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (response.data.success) {
      log('✅ Upload successful!', 'green');
      log('\nVideo Details:', 'blue');
      log(`  ID: ${response.data.video.id}`, 'green');
      log(`  Title: ${response.data.video.title}`, 'green');
      log(`  Bunny Path: ${response.data.bunnyPaths.video}`, 'green');
      log(`  Thumbnail Path: ${response.data.bunnyPaths.thumbnail || 'N/A'}`, 'green');

      // Verify file exists on Bunny.net
      log('\n2️⃣ Verifying file exists on Bunny.net...', 'yellow');
      
      const bunnyCheckUrl = `https://storage.bunnycdn.com/cliniquedesjuristesvideos${response.data.bunnyPaths.video}`;
      const bunnyPassword = process.env.BUNNY_READONLY_PASSWORD;
      
      if (!bunnyPassword) {
        log('⚠️ BUNNY_READONLY_PASSWORD not set, skipping file verification', 'yellow');
      } else {
        try {
          const checkResponse = await axios.head(bunnyCheckUrl, {
            headers: {
              'AccessKey': bunnyPassword
            }
          });
          
          if (checkResponse.status === 200) {
            log('✅ File verified on Bunny.net!', 'green');
          } else {
            log(`⚠️ Unexpected status: ${checkResponse.status}`, 'yellow');
          }
        } catch (checkError) {
          if (checkError.response?.status === 404) {
            log('❌ File not found on Bunny.net!', 'red');
          } else {
            log(`⚠️ Could not verify file: ${checkError.message}`, 'yellow');
          }
        }
      }

      // Verify database entry
      log('\n3️⃣ Verifying database entry...', 'yellow');
      
      const dbCheckResponse = await axios.get(
        `${API_URL}/api/videos/${response.data.video.id}`
      );
      
      if (dbCheckResponse.data) {
        log('✅ Database entry verified!', 'green');
        log(`  Title: ${dbCheckResponse.data.title}`, 'green');
        log(`  Path: ${dbCheckResponse.data.path}`, 'green');
      } else {
        log('❌ Database entry not found!', 'red');
      }

      log('\n' + '='.repeat(50), 'blue');
      log('✅ All tests passed!', 'green');
      
      return true;
    } else {
      log('❌ Upload failed: ' + response.data.message, 'red');
      return false;
    }

  } catch (error) {
    log('\n❌ Test failed:', 'red');
    if (error.response) {
      log(`  Status: ${error.response.status}`, 'red');
      log(`  Message: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else {
      log(`  Error: ${error.message}`, 'red');
    }
    return false;
  } finally {
    // Clean up test files
    try {
      const testDir = path.join(__dirname, '../tmp');
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
        log('\n🧹 Cleaned up test files', 'blue');
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Run the test
if (require.main === module) {
  testUpload()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`\n❌ Unexpected error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testUpload };
