"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbConfig = getDbConfig;
exports.getDbPool = getDbPool;
exports.getDbPoolAsync = getDbPoolAsync;
exports.__resetPoolForTest = __resetPoolForTest;
exports.getDbConnection = getDbConnection;
const mysql = __importStar(require("mysql2/promise"));
require("dotenv/config");
function getDbConfig() {
    const env = process.env;
    const host = env.DISCORD_GAME_DB_HOST || env.DB_HOST;
    const user = env.DISCORD_GAME_DB_USER || env.DB_USER;
    const password = env.DISCORD_GAME_DB_PASS || env.DB_PASS;
    const database = env.DISCORD_GAME_DB_NAME || env.DB_NAME;
    let port = Number(env.DISCORD_GAME_DB_PORT || env.DB_PORT || 3306);
    if (isNaN(port))
        port = 3306;
    if (!host || !user || !database) {
        throw new Error('Missing required DB environment variables. Set DISCORD_GAME_DB_* or DB_*');
    }
    return {
        host,
        user,
        password: (typeof password === 'string' && password.length > 0) ? password : undefined,
        database,
        port,
        charset: 'utf8mb4',
        ssl: { rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 50, // Increased for concurrency fuzzing
        queueLimit: 0,
    };
}
let poolPromise = null;
let pool = null;
function getDbPool() {
    if (pool)
        return pool;
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
    throw new Error('getDbPool() called before pool is ready. Use getDbPoolAsync() in concurrent code.');
}
// Async version for concurrent-safe pool access
async function getDbPoolAsync() {
    if (pool)
        return pool;
    if (!poolPromise) {
        poolPromise = (async () => {
            const newPool = mysql.createPool(getDbConfig());
            try {
                const conn = await newPool.getConnection();
                // Just acquire and release to ensure pool is ready
                if (conn && typeof conn.release === 'function') {
                    conn.release();
                }
            }
            catch (e) {
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
function __resetPoolForTest() {
    pool = null;
    poolPromise = null;
}
// No import-time pool creation or db export!
// Only create pools/connections when explicitly called in code or tests.
async function getDbConnection() {
    const env = process.env;
    let port = Number(env.DISCORD_GAME_DB_PORT || env.DB_PORT || 3306);
    if (isNaN(port))
        port = 3306;
    const host = env.DISCORD_GAME_DB_HOST || env.DB_HOST;
    const user = env.DISCORD_GAME_DB_USER || env.DB_USER;
    const password = env.DISCORD_GAME_DB_PASS || env.DB_PASS;
    const database = env.DISCORD_GAME_DB_NAME || env.DB_NAME;
    if (!host || !user || !database) {
        throw new Error('Missing database environment variables: DISCORD_GAME_DB_HOST, DISCORD_GAME_DB_USER, DISCORD_GAME_DB_NAME');
    }
    return await require('mysql2/promise').createConnection({
        host,
        port,
        user,
        password: (typeof password === 'string' && password.length > 0) ? password : undefined,
        database,
        charset: 'utf8mb4',
        ssl: { rejectUnauthorized: false },
    });
}
