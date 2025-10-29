import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

class Database {
  private pool: mysql.Pool;

  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    let connectionConfig: mysql.PoolOptions;

    if (dbUrl) {
      const url = new URL(dbUrl);
      connectionConfig = {
        host: url.hostname,
        port: parseInt(url.port) || 3306, // Changed from 3307 to 3306
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.slice(1),
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        charset: 'utf8mb4'
      };
    } else {
      connectionConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'), // Changed from 3307 to 3306
        user: process.env.DB_USER || 'c2668909c_clinique_user',
        password: process.env.DB_PASSWORD || 'bKM8P}ZPWhH+{)Fg',
        database: process.env.DB_NAME || 'c2668909c_clinique_db',
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        charset: 'utf8mb4'
      };
    }

    this.pool = mysql.createPool(connectionConfig);
    this.testConnection();
  }

  async query(text: string, params?: any[]): Promise<any> {
    try {
      const [rows, fields] = await this.pool.execute(text, params);
      
      // Handle INSERT/UPDATE/DELETE results
      if (rows && typeof rows === 'object' && 'insertId' in rows) {
        return {
          rows: [],
          fields,
          insertId: (rows as any).insertId,
          affectedRows: (rows as any).affectedRows
        };
      }
      
      // Handle SELECT results
      return { 
        rows: Array.isArray(rows) ? rows : [], 
        fields,
        insertId: undefined,
        affectedRows: undefined
      };
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async testConnection(): Promise<boolean> {
    try {
      const [rows] = await this.pool.execute('SELECT NOW() as now');
      console.log('🔗 Connected to MySQL database');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  getPool(): mysql.Pool {
    return this.pool;
  }
}

export default new Database();


//database mta3 local al bureau 