/**
 * Setup script to test Bunny.net Storage connection
 * Run with: node setup-bunny-storage.js
 */

// Load environment variables from .env file
require('dotenv').config();

const ftp = require('basic-ftp');

async function testBunnyConnection() {
  console.log('🐰 Testing Bunny.net Storage Connection...\n');

  // Check if environment variables are set
  const hostname = process.env.BUNNY_STORAGE_HOSTNAME;
  const username = process.env.BUNNY_STORAGE_USERNAME;
  const password = process.env.BUNNY_STORAGE_PASSWORD;
  const port = parseInt(process.env.BUNNY_STORAGE_PORT || '21');

  console.log('📋 Configuration:');
  console.log(`   Hostname: ${hostname || '❌ NOT SET'}`);
  console.log(`   Username: ${username || '❌ NOT SET'}`);
  console.log(`   Password: ${password ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   Port: ${port}\n`);

  if (!username || !password) {
    console.error('❌ ERROR: BUNNY_STORAGE_USERNAME and BUNNY_STORAGE_PASSWORD must be set');
    console.error('\nPlease follow these steps:');
    console.error('1. Copy .env.example to .env');
    console.error('   cp .env.example .env');
    console.error('2. Edit .env and update DATABASE_URL with your database credentials');
    console.error('3. The Bunny.net credentials are already configured in .env.example\n');
    process.exit(1);
  }

  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('🔌 Connecting to Bunny.net FTP server...');
    
    await client.access({
      host: hostname,
      user: username,
      password: password,
      port: port,
      secure: false // Using FTP (not FTPS) for development
    });

    console.log('✅ Successfully connected to Bunny.net!\n');

    // Test listing root directory
    console.log('📂 Listing root directory:');
    const list = await client.list('/');
    
    if (list.length === 0) {
      console.log('   (empty - no folders yet)\n');
      console.log('📁 Creating recommended folder structure...');
      
      // Create folders if they don't exist
      const folders = ['videos', 'thumbnails', 'materials', 'blog'];
      for (const folder of folders) {
        try {
          await client.ensureDir(`/${folder}`);
          console.log(`   ✅ Created /${folder}`);
        } catch (err) {
          console.log(`   ℹ️  /${folder} already exists or could not be created`);
        }
      }
    } else {
      list.forEach(item => {
        const type = item.isDirectory ? '📁' : '📄';
        console.log(`   ${type} ${item.name}`);
      });
    }

    console.log('\n✅ Bunny.net Storage is ready to use!');
    console.log('\n📚 Next steps:');
    console.log('   1. Run npm run dev to start the application');
    console.log('   2. Login as admin and upload a video');
    console.log('   3. Check your Bunny.net dashboard to see the uploaded files\n');

  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify your credentials in the .env file');
    console.error('2. Check if your firewall allows FTP connections (port 21)');
    console.error('3. Verify the Storage Zone exists in your Bunny.net dashboard');
    console.error('4. Check Bunny.net service status\n');
    process.exit(1);
  } finally {
    client.close();
  }
}

// Run the test
testBunnyConnection().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
