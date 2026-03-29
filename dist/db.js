"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbConnection = getDbConnection;
// MySQL database connection setup
const promise_1 = __importDefault(require("mysql2/promise"));
function getDbEnv(name) {
    return process.env[`DISCORD_GAME_DB_${name}`] ?? process.env[`DB_${name}`];
}
async function getDbConnection() {
    const requiredVars = ['HOST', 'USER', 'NAME'];
    const missingVars = requiredVars.filter((name) => !getDbEnv(name));
    if (missingVars.length > 0) {
        throw new Error(`Missing database environment variables: ${missingVars.map((name) => `DISCORD_GAME_DB_${name}`).join(', ')}`);
    }
    return promise_1.default.createConnection({
        host: getDbEnv('HOST'),
        port: getDbEnv('PORT') ? Number(getDbEnv('PORT')) : 3306,
        user: getDbEnv('USER'),
        password: getDbEnv('PASS'),
        database: getDbEnv('NAME'),
    });
}
