import dotenv from 'dotenv';
import path from 'path';

// Load .env file from project root
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

export const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'coin_exchange',
  },
  jwtSecret: process.env.JWT_SECRET || 'supersecret',
  port: Number(process.env.PORT) || 4000,
};
