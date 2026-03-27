import express from 'express';
import cors from 'cors';
import { getDbConnection } from './db';

const app = express();
app.use(cors());
app.use(express.json());

function getLimit(input: unknown, fallback: number, max: number) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 1) return 1;
  if (parsed > max) return max;
  return Math.floor(parsed);
}

// --- Leaderboard ---
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = getLimit(req.query.limit, 50, 500);
    const db = await getDbConnection();
    const [rows] = await db.execute(
      'SELECT user, score FROM leaderboard ORDER BY score DESC LIMIT ?'
      , [limit]
    );
    await db.end();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Game results ---
app.get('/api/game-results', async (req, res) => {
  try {
    const limit = getLimit(req.query.limit, 100, 500);
    const gameFilter = typeof req.query.game === 'string' ? req.query.game.trim() : '';

    const db = await getDbConnection();
    const [rows] = gameFilter
      ? await db.execute(
          'SELECT id, user, game, result, score, created_at FROM game_results WHERE game = ? ORDER BY created_at DESC LIMIT ?',
          [gameFilter, limit]
        )
      : await db.execute(
          'SELECT id, user, game, result, score, created_at FROM game_results ORDER BY created_at DESC LIMIT ?',
          [limit]
        );
    await db.end();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Affiliates ---
app.get('/api/affiliates', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const db = await getDbConnection();
    const [rows] = status
      ? await db.execute(
          'SELECT user_id, status, requested_at, approved_at, approved_by FROM affiliates WHERE status = ? ORDER BY requested_at DESC',
          [status]
        )
      : await db.execute(
          'SELECT user_id, status, requested_at, approved_at, approved_by FROM affiliates ORDER BY requested_at DESC'
        );
    await db.end();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Codes ---
app.get('/api/codes', async (req, res) => {
  try {
    const limit = getLimit(req.query.limit, 100, 500);
    const db = await getDbConnection();
    const [rows] = await db.execute(
      'SELECT code, source, created_at FROM codes ORDER BY created_at DESC LIMIT ?'
      , [limit]
    );
    await db.end();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Audit log ---
app.get('/api/audit-log', async (req, res) => {
  try {
    const limit = getLimit(req.query.limit, 100, 500);
    const db = await getDbConnection();
    const [rows] = await db.execute(
      'SELECT id, user_id, server_id, action, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?'
      , [limit]
    );
    await db.end();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Stats summary ---
app.get('/api/stats', async (_req, res) => {
  try {
    const db = await getDbConnection();
    const [[leaderboard]] = await db.execute('SELECT COUNT(*) AS total FROM leaderboard') as any;
    const [[games]] = await db.execute('SELECT COUNT(*) AS total FROM game_results') as any;
    const [[affiliates]] = await db.execute("SELECT COUNT(*) AS total FROM affiliates WHERE status = 'active'") as any;
    const [[codes]] = await db.execute('SELECT COUNT(*) AS total FROM codes') as any;
    await db.end();
    res.json({
      players: leaderboard.total,
      games: games.total,
      affiliates: affiliates.total,
      codes: codes.total,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Advanced analytics overview ---
app.get('/api/overview', async (_req, res) => {
  try {
    const db = await getDbConnection();
    const [[players]] = (await db.execute('SELECT COUNT(*) AS total FROM leaderboard')) as any;
    const [[games]] = (await db.execute('SELECT COUNT(*) AS total FROM game_results')) as any;
    const [[affiliates]] = (await db.execute("SELECT COUNT(*) AS total FROM affiliates WHERE status = 'active'")) as any;
    const [[codes]] = (await db.execute('SELECT COUNT(*) AS total FROM codes')) as any;

    const [gameMixRows] = (await db.execute(
      'SELECT game, COUNT(*) AS total FROM game_results GROUP BY game ORDER BY total DESC LIMIT 8'
    )) as any;

    const [resultMixRows] = (await db.execute(
      'SELECT result, COUNT(*) AS total FROM game_results GROUP BY result ORDER BY total DESC'
    )) as any;

    const [dailyRows] = (await db.execute(
      `SELECT DATE(created_at) AS day, COUNT(*) AS total
       FROM game_results
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day ASC`
    )) as any;

    await db.end();

    res.json({
      stats: {
        players: players.total,
        games: games.total,
        affiliates: affiliates.total,
        codes: codes.total,
      },
      gameMix: gameMixRows,
      resultMix: resultMixRows,
      dailyGames: dailyRows,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export function startApiServer(port = 3001) {
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}
