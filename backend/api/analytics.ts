// Example analytics endpoint with correct TypeScript typing

// Simulated async DB query function
async function query(sql: string): Promise<any[]> {
  // Replace with real DB logic
  return [{ count: Math.floor(Math.random() * 100) }];
}

export default async function handler(req: any, res: any) {
  const tables = ["users", "transactions", "offers"];
  // Explicitly type stats to avoid any TS ambiguity
  const stats: Record<string, number | string> = Object.create(null);

  for (const table of tables) {
    try {
      stats[table] =
        (await query(`SELECT COUNT(*) as count FROM ${table}`))[0]?.count || 0;
    } catch (err) {
      stats[table] = "error";
    }
  }

  res.status(200).json(stats);
}
