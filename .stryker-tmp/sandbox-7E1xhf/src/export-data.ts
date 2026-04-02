// @ts-nocheck
// Utility to export all operational data as a zip archive
import { getDbConnection } from './db';
import archiver from 'archiver';
// 
import fs from 'fs';

export async function exportAllDataZip(outputPath = 'exported_data.zip') {
  const db = await getDbConnection();
  const tables = ['codes', 'leaderboard', 'game_results', 'audit_logs'];
  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = fs.createWriteStream(outputPath);
  archive.pipe(output);

  for (const table of tables) {
    const [rows] = await db.execute(`SELECT * FROM ${table}`);
    archive.append(JSON.stringify(rows, null, 2), { name: `${table}.json` });
  }

  await archive.finalize();
  return outputPath;
}

// Usage: await exportAllDataZip('backup.zip');
