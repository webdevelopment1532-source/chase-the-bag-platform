"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.getProvidedToken = getProvidedToken;
exports.authenticateApi = authenticateApi;
exports.auditApiAccess = auditApiAccess;
exports.getLimit = getLimit;
exports.startApiServer = startApiServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const audit_log_1 = require("./audit-log");
const coin_exchange_1 = require("./coin-exchange");
const rag_1 = require("./rag");
const scraper_1 = require("./scraper");
dotenv_1.default.config();
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.static('public'));
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN ?? '';
const API_ADMIN_ID = process.env.API_ADMIN_ID ?? 'dashboard-admin';
const ALLOWED_GAMES = new Set(['coinflip', 'dice', 'roulette', 'crash', 'blackjack', 'slots', 'plinko', 'mines']);
const ALLOWED_AFFILIATE_STATUSES = new Set(['pending', 'active', 'removed']);
const ALLOWED_OFFER_STATUSES = new Set(['open', 'accepted', 'cancelled']);
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many API requests. Please retry shortly.' },
});
const sensitiveLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests to sensitive endpoint. Please retry shortly.' },
});
function getProvidedToken(req) {
    const authHeader = req.header('authorization') ?? '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
        return authHeader.slice(7).trim();
    }
    return req.header('x-api-key')?.trim() ?? '';
}
function authenticateApi(req, res, next) {
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
async function auditApiAccess(action, req) {
    try {
        const actor = req.header('x-admin-user')?.trim() || API_ADMIN_ID;
        await (0, audit_log_1.logOperation)({
            userId: actor,
            serverId: 'api',
            action,
            details: `${req.method} ${req.path}`,
        });
    }
    catch {
        // Best-effort logging: do not fail requests on audit write issues.
    }
}
exports.app.use('/api', apiLimiter, authenticateApi);
function getLimit(input, fallback, max) {
    const parsed = Number(input);
    if (!Number.isFinite(parsed))
        return fallback;
    if (parsed < 1)
        return 1;
    if (parsed > max)
        return max;
    return Math.floor(parsed);
}
// --- Leaderboard ---
exports.app.get('/api/leaderboard', async (req, res) => {
    try {
        await auditApiAccess('api_view_leaderboard', req);
        const limit = getLimit(req.query.limit, 50, 500);
        const db = await (0, db_1.getDbConnection)();
        const [rows] = await db.execute('SELECT user, score FROM leaderboard ORDER BY score DESC LIMIT ?', [limit]);
        await db.end();
        res.json(rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Game results ---
exports.app.get('/api/game-results', async (req, res) => {
    try {
        await auditApiAccess('api_view_game_results', req);
        const limit = getLimit(req.query.limit, 100, 500);
        const gameFilter = typeof req.query.game === 'string' ? req.query.game.trim() : '';
        if (gameFilter && !ALLOWED_GAMES.has(gameFilter.toLowerCase())) {
            res.status(400).json({ error: 'Invalid game filter.' });
            return;
        }
        const db = await (0, db_1.getDbConnection)();
        const [rows] = gameFilter
            ? await db.execute('SELECT id, user, game, result, score, created_at FROM game_results WHERE game = ? ORDER BY created_at DESC LIMIT ?', [gameFilter, limit])
            : await db.execute('SELECT id, user, game, result, score, created_at FROM game_results ORDER BY created_at DESC LIMIT ?', [limit]);
        await db.end();
        res.json(rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Affiliates ---
exports.app.get('/api/affiliates', async (req, res) => {
    try {
        await auditApiAccess('api_view_affiliates', req);
        const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
        if (status && !ALLOWED_AFFILIATE_STATUSES.has(status.toLowerCase())) {
            res.status(400).json({ error: 'Invalid affiliate status filter.' });
            return;
        }
        const db = await (0, db_1.getDbConnection)();
        const [rows] = status
            ? await db.execute('SELECT user_id, status, requested_at, approved_at, approved_by FROM affiliates WHERE status = ? ORDER BY requested_at DESC', [status])
            : await db.execute('SELECT user_id, status, requested_at, approved_at, approved_by FROM affiliates ORDER BY requested_at DESC');
        await db.end();
        res.json(rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Codes ---
exports.app.get('/api/codes', sensitiveLimiter, async (req, res) => {
    try {
        await auditApiAccess('api_view_codes', req);
        const limit = getLimit(req.query.limit, 100, 500);
        const db = await (0, db_1.getDbConnection)();
        const [rows] = await db.execute('SELECT code, source, created_at FROM codes ORDER BY created_at DESC LIMIT ?', [limit]);
        await db.end();
        res.json(rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Audit log ---
exports.app.get('/api/audit-log', sensitiveLimiter, async (req, res) => {
    try {
        await auditApiAccess('api_view_audit_log', req);
        const limit = getLimit(req.query.limit, 100, 500);
        const db = await (0, db_1.getDbConnection)();
        const [rows] = await db.execute('SELECT id, user_id, server_id, action, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
        await db.end();
        res.json(rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Stats summary ---
exports.app.get('/api/stats', async (_req, res) => {
    try {
        await auditApiAccess('api_view_stats', _req);
        const db = await (0, db_1.getDbConnection)();
        const [[leaderboard]] = await db.execute('SELECT COUNT(*) AS total FROM leaderboard');
        const [[games]] = await db.execute('SELECT COUNT(*) AS total FROM game_results');
        const [[affiliates]] = await db.execute("SELECT COUNT(*) AS total FROM affiliates WHERE status = 'active'");
        const [[codes]] = await db.execute('SELECT COUNT(*) AS total FROM codes');
        await db.end();
        res.json({
            players: leaderboard.total,
            games: games.total,
            affiliates: affiliates.total,
            codes: codes.total,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Advanced analytics overview ---
exports.app.get('/api/overview', async (_req, res) => {
    try {
        await auditApiAccess('api_view_overview', _req);
        const db = await (0, db_1.getDbConnection)();
        const [[players]] = (await db.execute('SELECT COUNT(*) AS total FROM leaderboard'));
        const [[games]] = (await db.execute('SELECT COUNT(*) AS total FROM game_results'));
        const [[affiliates]] = (await db.execute("SELECT COUNT(*) AS total FROM affiliates WHERE status = 'active'"));
        const [[codes]] = (await db.execute('SELECT COUNT(*) AS total FROM codes'));
        const [gameMixRows] = (await db.execute('SELECT game, COUNT(*) AS total FROM game_results GROUP BY game ORDER BY total DESC LIMIT 8'));
        const [resultMixRows] = (await db.execute('SELECT result, COUNT(*) AS total FROM game_results GROUP BY result ORDER BY total DESC'));
        const [dailyRows] = (await db.execute(`SELECT DATE(created_at) AS day, COUNT(*) AS total
       FROM game_results
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day ASC`));
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Coin exchange overview ---
exports.app.get('/api/exchange/overview', sensitiveLimiter, async (req, res) => {
    try {
        await auditApiAccess('api_view_coin_exchange_overview', req);
        const overview = await (0, coin_exchange_1.getCoinExchangeOverview)();
        res.json(overview);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Coin exchange wallets ---
exports.app.get('/api/exchange/wallets', sensitiveLimiter, async (req, res) => {
    try {
        await auditApiAccess('api_view_coin_exchange_wallets', req);
        const limit = getLimit(req.query.limit, 50, 500);
        const wallets = await (0, coin_exchange_1.listCoinWallets)(limit);
        res.json(wallets);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Coin exchange offers ---
exports.app.get('/api/exchange/offers', sensitiveLimiter, async (req, res) => {
    try {
        await auditApiAccess('api_view_coin_exchange_offers', req);
        const limit = getLimit(req.query.limit, 50, 500);
        const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
        if (status && !ALLOWED_OFFER_STATUSES.has(status.toLowerCase())) {
            res.status(400).json({ error: 'Invalid offer status filter.' });
            return;
        }
        const offers = await (0, coin_exchange_1.listCoinOffers)(limit, status);
        res.json(offers);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Coin exchange transactions ---
exports.app.get('/api/exchange/transactions', sensitiveLimiter, async (req, res) => {
    try {
        await auditApiAccess('api_view_coin_exchange_transactions', req);
        const limit = getLimit(req.query.limit, 100, 500);
        const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
        const transactions = await (0, coin_exchange_1.listCoinTransactions)(limit, userId);
        res.json(transactions);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- RAG index status ---
exports.app.get('/api/rag/index', sensitiveLimiter, async (req, res) => {
    try {
        await auditApiAccess('api_view_rag_index', req);
        const refresh = String(req.query.refresh ?? '').toLowerCase() === 'true';
        const stats = await (0, rag_1.getRagIndex)(refresh);
        res.json({ ok: true, stats });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- RAG query ---
exports.app.post('/api/rag/query', sensitiveLimiter, async (req, res) => {
    try {
        await auditApiAccess('api_query_rag', req);
        const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
        if (!query) {
            res.status(400).json({ error: 'Missing query string in request body.' });
            return;
        }
        const topK = getLimit(req.body?.topK, 5, 10);
        const response = await (0, rag_1.answerWithContext)(query, topK);
        res.json(response);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- RAG retrieval (raw chunks) ---
exports.app.get('/api/rag/retrieve', sensitiveLimiter, async (req, res) => {
    try {
        await auditApiAccess('api_retrieve_rag', req);
        const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
        if (!query) {
            res.status(400).json({ error: 'Missing query parameter.' });
            return;
        }
        const topK = getLimit(req.query.topK, 5, 10);
        const response = await (0, rag_1.queryRag)(query, topK);
        res.json(response);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Scraper: trigger code scraping ---
exports.app.post('/api/scraper/run', sensitiveLimiter, async (req, res) => {
    try {
        await auditApiAccess('api_trigger_scraper', req);
        const codes = await (0, scraper_1.scrapeStakeCodes)();
        res.json({
            ok: true,
            message: `Scraper completed: ${codes.length} codes found`,
            count: codes.length,
            sample: codes.slice(0, 3),
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        res.status(500).json({
            ok: false,
            error: err.message,
            timestamp: new Date().toISOString(),
        });
    }
});
// --- Scraper: view latest codes ---
exports.app.get('/api/scraper/status', sensitiveLimiter, async (req, res) => {
    try {
        await auditApiAccess('api_view_scraper_status', req);
        const db = await (0, db_1.getDbConnection)();
        const [[codeCount]] = (await db.execute('SELECT COUNT(*) AS total FROM codes'));
        const [recentCodes] = (await db.execute('SELECT code, source, created_at FROM codes ORDER BY created_at DESC LIMIT 10'));
        await db.end();
        res.json({
            ok: true,
            totalCodes: codeCount.total,
            recentCodes,
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        res.status(500).json({
            ok: false,
            error: err.message,
            timestamp: new Date().toISOString(),
        });
    }
});
function startApiServer(port = 3001) {
    exports.app.listen(port, () => {
        console.log(`API server running on http://localhost:${port}`);
    });
}
