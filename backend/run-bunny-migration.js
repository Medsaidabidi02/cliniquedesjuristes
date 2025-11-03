/**
 * Bunny.net Video Table Migration for MySQL 5.x
 * Adds required columns for Bunny.net CDN integration
 * 
 * Usage: node run-bunny-migration.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  console.log('🔧 Starting Bunny.net video table migration...\n');
  
  // Parse DATABASE_URL if it exists, otherwise use individual vars
  let config;
  
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (match) {
      config = {
        host: match[3],
        port: parseInt(match[4]),
        user: decodeURIComponent(match[1]),
        password: decodeURIComponent(match[2]),
        database: match[5]
      };
      console.log('📊 Using DATABASE_URL configuration');
    } else {
      throw new Error('Invalid DATABASE_URL format');
    }
  } else {
    config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'c2668909c_clinique_db',
      port: process.env.DB_PORT || 3306
    };
    console.log('📊 Using individual DB_* environment variables');
  }

  console.log('📊 Database Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}\n`);

  let connection;
  
  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully!\n');

    // Check if videos table exists
    console.log('🔍 Checking if videos table exists...');
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'videos'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Videos table does not exist!');
      console.log('   Please create the videos table first.\n');
      process.exit(1);
    }
    
    console.log('✅ Videos table exists\n');

    // Check current table structure
    console.log('🔍 Checking current videos table structure...');
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM videos
    `);
    
    const columnNames = columns.map(col => col.Field);
    console.log('   Current columns:', columnNames.join(', '), '\n');
    
    // Define columns to add
    const columnsToAdd = [
      { name: 'course_id', definition: 'INT DEFAULT NULL', after: 'id' },
      { name: 'lesson_slug', definition: 'VARCHAR(255) DEFAULT NULL', after: 'course_id' },
      { name: 'path', definition: 'VARCHAR(1000) DEFAULT NULL COMMENT "Path on Bunny.net storage"', after: 'filename' },
      { name: 'is_locked', definition: 'BOOLEAN DEFAULT FALSE COMMENT "Whether content requires payment"', after: 'thumbnail_path' }
    ];

    // Add missing columns
    for (const col of columnsToAdd) {
      if (!columnNames.includes(col.name)) {
        console.log(`📝 Adding ${col.name} column...`);
        await connection.query(`
          ALTER TABLE videos 
          ADD COLUMN ${col.name} ${col.definition}
        `);
        console.log(`✅ ${col.name} column added!\n`);
      } else {
        console.log(`ℹ️  ${col.name} column already exists, skipping...\n`);
      }
    }

    // Create indexes if they don't exist
    console.log('📝 Checking for indexes...');
    const [indexes] = await connection.query(`
      SHOW INDEX FROM videos
    `);
    
    const indexNames = indexes.map(idx => idx.Key_name);
    
    const indexesToCreate = [
      { name: 'idx_course_id', column: 'course_id' },
      { name: 'idx_lesson_slug', column: 'lesson_slug' },
      { name: 'idx_is_locked', column: 'is_locked' },
      { name: 'idx_subject_id', column: 'subject_id' }
    ];

    for (const idx of indexesToCreate) {
      if (!indexNames.includes(idx.name)) {
        // Check if column exists before creating index
        const [cols] = await connection.query(`SHOW COLUMNS FROM videos WHERE Field = ?`, [idx.column]);
        if (cols.length > 0) {
          console.log(`📝 Creating index ${idx.name}...`);
          await connection.query(`
            CREATE INDEX ${idx.name} ON videos(${idx.column})
          `);
          console.log(`✅ Index ${idx.name} created!\n`);
        }
      } else {
        console.log(`ℹ️  Index ${idx.name} already exists, skipping...\n`);
      }
    }

    // Update existing records to have lesson_slug if null
    console.log('📝 Updating existing records with lesson_slug...');
    const [result1] = await connection.query(`
      UPDATE videos 
      SET lesson_slug = CONCAT('lesson-', id) 
      WHERE lesson_slug IS NULL OR lesson_slug = ''
    `);
    console.log(`✅ Updated ${result1.affectedRows} records with lesson_slug\n`);

    // Update path field to match video_path or file_path for existing records
    console.log('📝 Updating existing records with path...');
    
    // Check which columns exist to build the COALESCE query dynamically
    const pathSourceColumns = ['video_path', 'file_path', 'filename', 'file_name'];
    const existingPathColumns = pathSourceColumns.filter(col => columnNames.includes(col));
    
    if (existingPathColumns.length > 0) {
      const coalesceFields = existingPathColumns.join(', ');
      const [result2] = await connection.query(`
        UPDATE videos 
        SET path = COALESCE(${coalesceFields}) 
        WHERE path IS NULL OR path = ''
      `);
      console.log(`✅ Updated ${result2.affectedRows} records with path\n`);
    } else {
      console.log('⚠️  No source columns found for path, skipping update...\n');
    }

    // Ensure all videos have a course_id (fallback to subject's course_id if available)
    console.log('📝 Updating course_id from subjects...');
    
    try {
      // Check if subjects table exists
      const [subjectsTables] = await connection.query(`SHOW TABLES LIKE 'subjects'`);
      
      if (subjectsTables.length > 0 && columnNames.includes('subject_id')) {
        const [result3] = await connection.query(`
          UPDATE videos v
          LEFT JOIN subjects s ON v.subject_id = s.id
          SET v.course_id = s.course_id
          WHERE (v.course_id IS NULL OR v.course_id = 0) AND s.course_id IS NOT NULL
        `);
        console.log(`✅ Updated ${result3.affectedRows} records with course_id\n`);
      } else {
        console.log('⚠️  Subjects table not found or subject_id column missing, skipping course_id update...\n');
      }
    } catch (error) {
      console.log('⚠️  Could not update course_id from subjects:', error.message);
      console.log('   This is not critical - you can set course_id manually when uploading videos.\n');
    }

    // Verify final structure
    console.log('🔍 Verifying final table structure...');
    const [finalColumns] = await connection.query(`
      SHOW COLUMNS FROM videos
    `);
    
    console.log('\n📋 Final videos table columns:');
    finalColumns.forEach(col => {
      const marker = ['course_id', 'lesson_slug', 'path', 'is_locked'].includes(col.Field) ? '✨ NEW' : '';
      console.log(`   ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${marker}`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Configure Bunny.net environment variables (see BUNNY_SETUP_GUIDE.md)');
    console.log('   3. Test video upload through admin panel\n');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MySQL server is running!');
      console.error('   - Check if MySQL/MariaDB service is started');
      console.error('   - Verify DB_HOST, DB_PORT in .env file');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Database access denied!');
      console.error('   - Check DB_USER and DB_PASSWORD in .env file');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist!');
      console.error(`   - Create database: CREATE DATABASE ${config.database};`);
      console.error('   - Or check DB_NAME in .env file');
    } else if (error.code === 'ER_DUP_FIELDNAME') {
      console.error('\n💡 Column already exists!');
      console.error('   This usually means the migration was already run.');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Run migration
runMigration();
