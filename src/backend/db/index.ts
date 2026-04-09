import * as mysql from "mysql2/promise";
import { Pool } from "mysql2/promise";
import "dotenv/config";

export interface DbConfig {
  host: string;
  user: string;
  password?: string;
  database: string;
  port: number;
  charset: string;
  ssl: { rejectUnauthorized: boolean };
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

export function getDbConfig(): DbConfig {
  const env = process.env;
  const host = env.DISCORD_GAME_DB_HOST || env.DB_HOST;
  const user = env.DISCORD_GAME_DB_USER || env.DB_USER;
  const password = env.DISCORD_GAME_DB_PASS || env.DB_PASS;
  const database = env.DISCORD_GAME_DB_NAME || env.DB_NAME;
  let port = Number(env.DISCORD_GAME_DB_PORT || env.DB_PORT || 3306);
  if (isNaN(port)) port = 3306;
  if (!host || !user || !database) {
    throw new Error(
      "Missing required DB environment variables. Set DISCORD_GAME_DB_* or DB_*",
    );
  }
  return {
    host,
    user,
    password:
      typeof password === "string" && password.length > 0
        ? password
        : undefined,
    database,
    port,
    charset: "utf8mb4",
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 50, // Increased for concurrency fuzzing
    queueLimit: 0,
  };
}

let poolPromise: Promise<Pool> | null = null;
let pool: Pool | null = null;
export function getDbPool(): Pool {
  if (pool) return pool;
  if (!poolPromise) {
    poolPromise = (async () => {
      const newPool = mysql.createPool(getDbConfig());
      // Optionally test connection to ensure pool is ready
      // Do not acquire a connection here; just assign and return the pool
      pool = newPool;
      return newPool;
    })();
  }
  // Block until pool is ready
  throw new Error(
    "getDbPool() called before pool is ready. Use getDbPoolAsync() in concurrent code.",
  );
}

// Async version for concurrent-safe pool access
export async function getDbPoolAsync(): Promise<Pool> {
  if (pool) return pool;
  if (!poolPromise) {
    poolPromise = (async () => {
      const newPool = mysql.createPool(getDbConfig());
      try {
        const conn = await newPool.getConnection();
        // Just acquire and release to ensure pool is ready
        if (conn && typeof conn.release === "function") {
          conn.release();
        }
      } catch (e) {
        poolPromise = null;
        throw e;
      }
      pool = newPool;
      return newPool;
    })();
  }
  return poolPromise;
}

// TEST-ONLY: Reset the pool singleton for unit/mutation tests
export function __resetPoolForTest() {
  pool = null;
  poolPromise = null;
}

// No import-time pool creation or db export!
// Only create pools/connections when explicitly called in code or tests.

export async function getDbConnection() {
  const env = process.env;
  let port = Number(env.DISCORD_GAME_DB_PORT || env.DB_PORT || 3306);
  if (isNaN(port)) port = 3306;
  const host = env.DISCORD_GAME_DB_HOST || env.DB_HOST;
  const user = env.DISCORD_GAME_DB_USER || env.DB_USER;
  const password = env.DISCORD_GAME_DB_PASS || env.DB_PASS;
  const database = env.DISCORD_GAME_DB_NAME || env.DB_NAME;
  if (!host || !user || !database) {
    throw new Error(
      "Missing database environment variables: DISCORD_GAME_DB_HOST, DISCORD_GAME_DB_USER, DISCORD_GAME_DB_NAME",
    );
  }
  return await require("mysql2/promise").createConnection({
    host,
    port,
    user,
    password:
      typeof password === "string" && password.length > 0
        ? password
        : undefined,
    database,
    charset: "utf8mb4",
    ssl: { rejectUnauthorized: false },
  });
}
