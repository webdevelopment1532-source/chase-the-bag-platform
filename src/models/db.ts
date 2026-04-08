import mysql from 'mysql2/promise';
import { config } from '../config/config';

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('MySQL connection successful.');
  } catch (err) {
    console.error('MySQL connection failed:', err);
    process.exit(1);
  }
}
