import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { getDbConnection } from './db';
import { logOperation } from './audit-log';
import { getCoinExchangeOverview, listCoinOffers, listCoinTransactions, listCoinWallets } from './coin-exchange';
import { answerWithContext, getRagIndex, queryRag } from './rag';
import { scrapeStakeCodes } from './scraper';

dotenv.config();

export const app = express();
app.use(cors());
app.use(express.json());

const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN ?? '';
const API_ADMIN_ID = process.env.API_ADMIN_ID ?? 'dashboard-admin';
const ALLOWED_GAMES = new Set(['coinflip', 'dice', 'roulette', 'crash', 'blackjack', 'slots', 'plinko', 'mines']);
const ALLOWED_AFFILIATE_STATUSES = new Set(['pending', 'active', 'removed']);
const ALLOWED_OFFER_STATUSES = new Set(['open', 'accepted', 'cancelled']);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many API requests. Please retry shortly.' },
});

const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests to sensitive endpoint. Please retry shortly.' },
});

export function getProvidedToken(req: express.Request) {
  const authHeader = req.header('authorization') ?? '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return req.header('x-api-key')?.trim() ?? '';
}

export function authenticateApi(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!API_AUTH_TOKEN) {
    res.status(503).json({ error: 'API authentication is not configured on server.' });
    return;
  }

  const token = getProvidedToken(req);
  if (!token || token !== API_AUTH_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

export async function auditApiAccess(action: string, req: express.Request) {
  try {
    const actor = req.header('x-admin-user')?.trim() || API_ADMIN_ID;
    await logOperation({
      userId: actor,
      serverId: 'api',
      action,
      details: `${req.method} ${req.path}`,
    });
  } catch {
    // Best-effort logging: do not fail requests on audit write issues.
  }
}

app.use('/api', apiLimiter, authenticateApi);

export function getLimit(input: unknown, fallback: number, max: number) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 1) return 1;
  if (parsed > max) return max;
  return Math.floor(parsed);
}

// --- Leaderboard ---
app.get('/api/leaderboard', async (req, res) => {
  try {
    await auditApiAccess('api_view_leaderboard', req);
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
    await auditApiAccess('api_view_game_results', req);
    const limit = getLimit(req.query.limit, 100, 500);
    const gameFilter = typeof req.query.game === 'string' ? req.query.game.trim() : '';

    if (gameFilter && !ALLOWED_GAMES.has(gameFilter.toLowerCase())) {
      res.status(400).json({ error: 'Invalid game filter.' });
      return;
    }

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
    await auditApiAccess('api_view_affiliates', req);
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    if (status && !ALLOWED_AFFILIATE_STATUSES.has(status.toLowerCase())) {
      res.status(400).json({ error: 'Invalid affiliate status filter.' });
      return;
    }
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
app.get('/api/codes', sensitiveLimiter, async (req, res) => {
  try {
    await auditApiAccess('api_view_codes', req);
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
app.get('/api/audit-log', sensitiveLimiter, async (req, res) => {
  try {
    await auditApiAccess('api_view_audit_log', req);
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
    await auditApiAccess('api_view_stats', _req);
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
    await auditApiAccess('api_view_overview', _req);
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

// --- Coin exchange overview ---
app.get('/api/exchange/overview', sensitiveLimiter, async (req, res) => {
  try {
    await auditApiAccess('api_view_coin_exchange_overview', req);
    const overview = await getCoinExchangeOverview();
    res.json(overview);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Coin exchange wallets ---
app.get('/api/exchange/wallets', sensitiveLimiter, async (req, res) => {
  try {
    await auditApiAccess('api_view_coin_exchange_wallets', req);
    const limit = getLimit(req.query.limit, 50, 500);
    const wallets = await listCoinWallets(limit);
    res.json(wallets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Coin exchange offers ---
app.get('/api/exchange/offers', sensitiveLimiter, async (req, res) => {
  try {
    await auditApiAccess('api_view_coin_exchange_offers', req);
    const limit = getLimit(req.query.limit, 50, 500);
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    if (status && !ALLOWED_OFFER_STATUSES.has(status.toLowerCase())) {
      res.status(400).json({ error: 'Invalid offer status filter.' });
      return;
    }
    const offers = await listCoinOffers(limit, status);
    res.json(offers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Coin exchange transactions ---
app.get('/api/exchange/transactions', sensitiveLimiter, async (req, res) => {
  try {
    await auditApiAccess('api_view_coin_exchange_transactions', req);
    const limit = getLimit(req.query.limit, 100, 500);
    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    const transactions = await listCoinTransactions(limit, userId);
    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RAG index status ---
app.get('/api/rag/index', sensitiveLimiter, async (req, res) => {
  try {
    await auditApiAccess('api_view_rag_index', req);
    const refresh = String(req.query.refresh ?? '').toLowerCase() === 'true';
    const stats = await getRagIndex(refresh);
    res.json({ ok: true, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RAG query ---
app.post('/api/rag/query', sensitiveLimiter, async (req, res) => {
  try {
    await auditApiAccess('api_query_rag', req);
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!query) {
      res.status(400).json({ error: 'Missing query string in request body.' });
      return;
    }

    const topK = getLimit(req.body?.topK, 5, 10);
    const response = await answerWithContext(query, topK);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RAG retrieval (raw chunks) ---
app.get('/api/rag/retrieve', sensitiveLimiter, async (req, res) => {
  try {
    await auditApiAccess('api_retrieve_rag', req);
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    if (!query) {
      res.status(400).json({ error: 'Missing query parameter.' });
      return;
    }

    const topK = getLimit(req.query.topK, 5, 10);
    const response = await queryRag(query, topK);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Scraper: trigger code scraping ---
app.post('/api/scraper/run', sensitiveLimiter, async (req, res) => {
  try {
    await auditApiAccess('api_trigger_scraper', req);
    const codes = await scrapeStakeCodes();
    res.json({
      ok: true,
      message: `Scraper completed: ${codes.length} codes found`,
      count: codes.length,
      sample: codes.slice(0, 3),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ 
      ok: false, 
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// --- Scraper: view latest codes ---
app.get('/api/scraper/status', sensitiveLimiter, async (req, res) => {
  try {
    await auditApiAccess('api_view_scraper_status', req);
    const db = await getDbConnection();
    const [[codeCount]] = (await db.execute('SELECT COUNT(*) AS total FROM codes')) as any;
    const [recentCodes] = (await db.execute(
      'SELECT code, source, created_at FROM codes ORDER BY created_at DESC LIMIT 10'
    )) as any;
    await db.end();

    res.json({
      ok: true,
      totalCodes: codeCount.total,
      recentCodes,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ 
      ok: false, 
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export function startApiServer(port = 3001) {
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}
