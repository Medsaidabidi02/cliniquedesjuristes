#!/usr/bin/env node
/**
 * Complete Database Migration Runner for cPanel Deployment
 * Runs all SQL migration files in the migrations directory
 * 
 * Usage: node run-all-migrations.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runAllMigrations() {
  console.log('🔧 Starting complete database migration...\n');
  
  // Parse DATABASE_URL
  let config;
  
  if (process.env.DATABASE_URL) {
    try {
      const dbUrl = new URL(process.env.DATABASE_URL);
      config = {
        host: dbUrl.hostname,
        port: parseInt(dbUrl.port) || 3306,
        user: decodeURIComponent(dbUrl.username),
        password: decodeURIComponent(dbUrl.password),
        database: dbUrl.pathname.slice(1),
        multipleStatements: true
      };
      console.log('📊 Using DATABASE_URL configuration');
    } catch (error) {
      console.error('❌ Invalid DATABASE_URL format');
      console.error('   Expected: mysql://user:password@host:port/database');
      process.exit(1);
    }
  } else {
    config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'legal_education_mysql5',
      port: parseInt(process.env.DB_PORT) || 3306,
      multipleStatements: true
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

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error('❌ Migrations directory not found:', migrationsDir);
      process.exit(1);
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('ℹ️  No migration files found in', migrationsDir);
      return;
    }

    console.log(`📁 Found ${migrationFiles.length} migration file(s):\n`);
    migrationFiles.forEach((file, idx) => {
      console.log(`   ${idx + 1}. ${file}`);
    });
    console.log('');

    // Create migrations tracking table if it doesn't exist
    console.log('📝 Creating migrations tracking table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_filename (filename)
      )
    `);
    console.log('✅ Migrations table ready\n');

    // Get already executed migrations
    const [executedMigrations] = await connection.query(
      'SELECT filename FROM migrations'
    );
    const executedSet = new Set(executedMigrations.map(row => row.filename));

    // Run each migration
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const file of migrationFiles) {
      if (executedSet.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        skipCount++;
        continue;
      }

      console.log(`\n🔄 Running ${file}...`);
      
      try {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Execute the migration
        await connection.query(sql);
        
        // Record successful execution
        await connection.query(
          'INSERT INTO migrations (filename) VALUES (?)',
          [file]
        );
        
        console.log(`✅ ${file} completed successfully`);
        successCount++;
      } catch (error) {
        console.error(`❌ ${file} failed:`);
        console.error(`   Error: ${error.message}`);
        errorCount++;
        
        // Continue with other migrations even if one fails
        // Comment the next line if you want to stop on first error
        // throw error;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`   ✅ Successfully executed: ${successCount}`);
    console.log(`   ⏭️  Skipped (already done): ${skipCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📁 Total files: ${migrationFiles.length}`);
    console.log('='.repeat(60) + '\n');

    // Show current database statistics
    console.log('📊 Database Statistics:');
    try {
      const [tables] = await connection.query('SHOW TABLES');
      console.log(`   Total tables: ${tables.length}`);
      
      // Try to get user count
      try {
        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
        console.log(`   Total users: ${users[0].count}`);
      } catch (e) {
        console.log('   Total users: N/A (users table may not exist yet)');
      }
    } catch (e) {
      console.log('   Could not retrieve statistics');
    }

    if (errorCount === 0) {
      console.log('\n✅ All migrations completed successfully!');
      console.log('\n💡 Next steps:');
      console.log('   1. Restart your Node.js application');
      console.log('   2. Test the application thoroughly');
      console.log('   3. Check application logs for any issues\n');
    } else {
      console.log('\n⚠️  Some migrations failed. Please review errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Migration process failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Cannot connect to MySQL server!');
      console.error('   - Check if MySQL is running');
      console.error('   - Verify DB_HOST and DB_PORT in .env file');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Database access denied!');
      console.error('   - Check DB_USER and DB_PASSWORD in .env file');
      console.error('   - Ensure user has proper privileges');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist!');
      console.error(`   - Create database: CREATE DATABASE ${config.database};`);
      console.error('   - Or check DB_NAME in .env file');
    } else if (error.code === 'ENOENT') {
      console.error('\n💡 File or directory not found!');
      console.error('   - Ensure migrations directory exists');
      console.error('   - Check file paths are correct');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

// Run migrations
runAllMigrations();
