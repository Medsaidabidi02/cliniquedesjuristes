/**
 * Database Migration Runner
 * Complete session system with progressive cooldown
 * 
 * Usage: node run-migration.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔧 Starting complete session system migration...\n');
  
  // Parse DATABASE_URL if it exists, otherwise use individual vars
  let config;
  
  if (process.env.DATABASE_URL) {
    // Parse DATABASE_URL: mysql://user:password@host:port/database
    const dbUrl = process.env.DATABASE_URL;
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (match) {
      config = {
        host: match[3],
        port: parseInt(match[4]),
        user: match[1],
        password: match[2],
        database: match[5]
      };
      console.log('📊 Using DATABASE_URL configuration');
    } else {
      throw new Error('Invalid DATABASE_URL format');
    }
  } else {
    // Use individual environment variables
    config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'legal_education_mysql5',
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

    // Create sessions table
    console.log('📝 Creating/Updating sessions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        valid BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(512) NULL,
        last_activity TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_valid (valid),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Session tracking for single-device login enforcement'
    `);
    console.log('✅ Sessions table ready!\n');

    // Create login_attempts table
    console.log('📝 Creating/Updating login_attempts table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        attempt_count INT DEFAULT 0,
        cooldown_until DATETIME NULL,
        last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_cooldown_until (cooldown_until)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Track login attempts for progressive cooldown'
    `);
    console.log('✅ Login_attempts table ready!\n');

    // Show statistics
    console.log('\n📊 Current Statistics:');
    const [userStats] = await connection.query(`SELECT COUNT(*) as total_users FROM users`);
    const [sessionStats] = await connection.query(`SELECT COUNT(*) as total_sessions, COUNT(CASE WHEN valid = TRUE THEN 1 END) as active_sessions FROM sessions`);
    const [attemptStats] = await connection.query(`SELECT COUNT(*) as total_attempts FROM login_attempts`);
    
    console.log(`   Total users: ${userStats[0].total_users}`);
    console.log(`   Total sessions: ${sessionStats[0].total_sessions}`);
    console.log(`   Active sessions: ${sessionStats[0].active_sessions}`);
    console.log(`   Login attempts tracked: ${attemptStats[0].total_attempts}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Test single active session enforcement');
    console.log('   3. Test progressive cooldown after 5 attempts\n');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MySQL server is running!');
      console.error('   - Check XAMPP/WAMP is started');
      console.error('   - Verify DB_HOST, DB_PORT in .env file');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Database access denied!');
      console.error('   - Check DB_USER and DB_PASSWORD in .env file');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist!');
      console.error(`   - Create database: CREATE DATABASE ${config.database};`);
      console.error('   - Or check DB_NAME in .env file');
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
