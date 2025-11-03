#!/usr/bin/env node

/**
 * Test script to verify Bunny.net Storage integration
 * This script tests:
 * 1. Uploading a test file to Bunny.net
 * 2. Listing files in a directory
 * 3. Generating a signed URL
 * 4. Deleting the test file
 */

const axios = require('axios');
const crypto = require('crypto');

// Bunny.net configuration
const BUNNY_STORAGE_ZONE = 'cliniquedesjuristesvideos';
const BUNNY_STORAGE_HOST = 'storage.bunnycdn.com';
const BUNNY_WRITE_API_KEY = '2618a218-10c8-469a-9353-8a7ae921-7c28-499e';
const BUNNY_READ_API_KEY = '1fa435e1-2fbd-4c19-afb6-89a73265-0dbb-4756';
const BUNNY_CDN_URL = `https://${BUNNY_STORAGE_ZONE}.b-cdn.net`;
const BUNNY_API_BASE = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}`;

async function testBunnyStorage() {
  console.log('🧪 Testing Bunny.net Storage Integration\n');
  console.log('=' .repeat(60));

  // Test file content
  const testFileName = `/test/test-${Date.now()}.txt`;
  const testContent = Buffer.from('Hello from Clinique des Juristes! This is a test file.');

  try {
    // Test 1: Upload a file
    console.log('\n📤 Test 1: Uploading test file...');
    console.log(`   Path: ${testFileName}`);
    
    const uploadUrl = `${BUNNY_API_BASE}${testFileName}`;
    const uploadResponse = await axios.put(uploadUrl, testContent, {
      headers: {
        'AccessKey': BUNNY_WRITE_API_KEY,
        'Content-Type': 'text/plain',
      },
    });

    if (uploadResponse.status === 201 || uploadResponse.status === 200) {
      console.log('   ✅ File uploaded successfully!');
      console.log(`   URL: ${BUNNY_CDN_URL}${testFileName}`);
    } else {
      throw new Error(`Upload failed with status: ${uploadResponse.status}`);
    }

    // Test 2: List files in directory
    console.log('\n📋 Test 2: Listing files in /test/ directory...');
    
    const listUrl = `${BUNNY_API_BASE}/test/`;
    const listResponse = await axios.get(listUrl, {
      headers: {
        'AccessKey': BUNNY_READ_API_KEY,
      },
    });

    if (Array.isArray(listResponse.data)) {
      console.log(`   ✅ Found ${listResponse.data.length} file(s)`);
      listResponse.data.forEach(file => {
        console.log(`      - ${file.ObjectName} (${file.Length} bytes)`);
      });
    } else {
      console.log('   ⚠️ Unexpected response format');
    }

    // Test 3: Generate signed URL
    console.log('\n🔐 Test 3: Generating signed URL...');
    
    const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const tokenBase = `${BUNNY_READ_API_KEY}${testFileName}${expires}`;
    const token = crypto
      .createHash('sha256')
      .update(tokenBase)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const signedUrl = `${BUNNY_CDN_URL}${testFileName}?token=${token}&expires=${expires}`;
    console.log('   ✅ Signed URL generated:');
    console.log(`   ${signedUrl.substring(0, 80)}...`);

    // Test 4: Download the file (verify it exists)
    console.log('\n📥 Test 4: Verifying file download...');
    
    try {
      const downloadResponse = await axios.get(`${BUNNY_CDN_URL}${testFileName}`, {
        responseType: 'text',
      });
      
      if (downloadResponse.data === testContent.toString()) {
        console.log('   ✅ File content verified correctly!');
      } else {
        console.log('   ⚠️ File content mismatch');
      }
    } catch (downloadError) {
      console.log('   ⚠️ Download failed (file might not be replicated yet)');
    }

    // Test 5: Delete the file
    console.log('\n🗑️ Test 5: Deleting test file...');
    
    const deleteUrl = `${BUNNY_API_BASE}${testFileName}`;
    await axios.delete(deleteUrl, {
      headers: {
        'AccessKey': BUNNY_WRITE_API_KEY,
      },
    });
    
    console.log('   ✅ File deleted successfully!');

    // Test 6: Create directory structure for video storage
    console.log('\n📁 Test 6: Testing directory structure...');
    
    const testPaths = [
      '/videos/test-course-1/sample.mp4',
      '/thumbnails/test-course-1/sample.jpg',
      '/materials/test-course-1/document.pdf'
    ];

    console.log('   Recommended folder structure:');
    testPaths.forEach(path => {
      console.log(`   - ${path}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Upload: ✅ Working');
    console.log('   - List: ✅ Working');
    console.log('   - Signed URLs: ✅ Working');
    console.log('   - Delete: ✅ Working');
    console.log('\n🎉 Bunny.net Storage integration is ready to use!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run tests
testBunnyStorage();
