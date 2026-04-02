const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');

function getDbEnv(name) {
  return process.env[`DISCORD_GAME_DB_${name}`] ?? process.env[`DB_${name}`];
}

const requiredVars = ['HOST', 'USER', 'NAME'];
const missingVars = requiredVars.filter((name) => !getDbEnv(name));

if (missingVars.length > 0) {
  console.error(`Missing database environment variables: ${missingVars.map((name) => `DISCORD_GAME_DB_${name}`).join(', ')}`);
  process.exit(1);
}

const connectionConfig = {
  host: getDbEnv('HOST'),
  port: getDbEnv('PORT') ? Number(getDbEnv('PORT')) : 3306,
  user: getDbEnv('USER'),
  password: getDbEnv('PASS'),
  database: getDbEnv('NAME'),
};

const schemaFiles = ['codes.sql', 'leaderboard.sql', 'audit-log.sql', 'affiliates.sql', 'coin-exchange.sql'];

async function main() {
  const connection = await mysql.createConnection(connectionConfig);

  try {
    if (checkOnly) {
      await connection.query('SELECT 1');
      console.log(`Database connection OK for ${connectionConfig.database} at ${connectionConfig.host}:${connectionConfig.port}`);
      return;
    }

    for (const fileName of schemaFiles) {
      const filePath = path.join(__dirname, '..', 'src', fileName);
      const sql = fs.readFileSync(filePath, 'utf8');
      const statements = sql
        .split(/;\s*\n/)
        .map((statement) => statement.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await connection.query(statement);
      }

      console.log(`Applied schema: ${fileName}`);
    }

    console.log('Database initialization complete.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Database initialization failed.');
  console.error(error.message);
  process.exit(1);
});