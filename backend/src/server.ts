import app from './app';
import { config } from './config';
import database from './config/database';

const startServer = async () => {
  try {
    // Test database connection using the helper function
    const testResult = await database.query('SELECT NOW() as now');
    console.log(`✅ Database test query successful for Medsaidabidi02: ${JSON.stringify(testResult.rows)}`);
    console.log('✅ Database connected successfully');

    // ✅ SIMPLE ONE-SESSION-PER-USER: Reset all is_logged_in flags on server restart
    // This ensures clean state and handles users who closed browser without logging out
    try {
      const resetResult = await database.query(
        'UPDATE users SET is_logged_in = FALSE, current_session_id = NULL WHERE is_logged_in = TRUE'
      );
      if (resetResult.affectedRows > 0) {
        console.log(`✅ Reset is_logged_in and session IDs for ${resetResult.affectedRows} user(s) on server restart`);
      }
    } catch (resetError: any) {
      // Gracefully handle if columns don't exist yet - try basic approach
      console.warn('⚠️ Could not reset session tracking (columns may not exist):', resetError.code || resetError.message);
      try {
        const basicResetResult = await database.query(
          'UPDATE users SET is_logged_in = FALSE WHERE is_logged_in = TRUE'
        );
        if (basicResetResult.affectedRows > 0) {
          console.log(`✅ Reset is_logged_in for ${basicResetResult.affectedRows} user(s) (basic mode)`);
        }
      } catch (basicError: any) {
        console.warn('⚠️ Could not reset is_logged_in flags:', basicError.code || basicError.message);
      }
      console.warn('⚠️ Run migration: add_is_logged_in_column.sql');
    }

    // Check if admin exists
    const adminCheck = await database.query(
      'SELECT email, is_admin, is_approved FROM users WHERE is_admin = true'
    );
    
    console.log('👑 Admin users found:', adminCheck.rows.length);
    if (adminCheck.rows.length > 0) {
      console.log('👑 Admin details:', adminCheck.rows.map((u: any) => ({
        email: u.email,
        is_admin: u.is_admin,
        is_approved: u.is_approved
      })));
    }
    
    // Only start server if this file is run directly (not through Passenger)
    if (require.main === module) {
      app.listen(config.port, () => {
        console.log(`🚀 Server running on port ${config.port}`);
        console.log(`🌍 Environment: ${config.nodeEnv}`);
        console.log(`📡 API URL: ${config.apiUrl}`);
        console.log(`🎬 Hetzner HLS enabled: ${config.hetzner.enabled}`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error; // Re-throw for Passenger
  }
};

// Initialize the server
startServer();

