"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.startApiServer = startApiServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("./db");
const audit_log_1 = require("./audit-log");
const crawler_service_1 = require("./crawler-service");
const trading_1 = __importDefault(require("./routes/trading"));
const scrapers_1 = __importDefault(require("./routes/scrapers"));
const leaderboard_1 = require("./leaderboard");
const checkin_1 = require("./checkin");
const achievements_1 = require("./achievements");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
function getTrustProxySetting() {
    const raw = (process.env.CTB_TRUST_PROXY ?? '').trim();
    if (!raw)
        return false;
    const lower = raw.toLowerCase();
    if (lower === 'false' || lower === '0' || lower === 'off' || lower === 'no')
        return false;
    if (lower === 'true' || lower === 'on' || lower === 'yes')
        return true;
    const numeric = Number(raw);
    if (Number.isInteger(numeric) && numeric >= 0)
        return numeric;
    return raw;
}
const trustProxySetting = getTrustProxySetting();
const trustProxyEnabled = trustProxySetting !== false;
app.set('trust proxy', trustProxySetting);
app.disable('x-powered-by');
function getAllowedCorsOrigins() {
    const raw = process.env.CTB_CORS_ORIGINS
        ?? 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174';
    const origins = raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    return new Set(origins);
}
const allowedCorsOrigins = getAllowedCorsOrigins();
app.use((0, cors_1.default)({
    origin(origin, callback) {
        // Non-browser clients (no Origin) are allowed and remain protected by API auth.
        if (!origin) {
            callback(null, true);
            return;
        }
        callback(null, allowedCorsOrigins.has(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-API-Key', 'X-Admin-User', 'X-CTB-Crawler-Key'],
    optionsSuccessStatus: 204,
}));
app.use(express_1.default.json({ limit: '16kb' }));
app.use((req, res, next) => {
    const isHttps = req.secure;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    if (isHttps) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN ?? /* istanbul ignore next */ '';
const API_ADMIN_ID = process.env.API_ADMIN_ID ?? /* istanbul ignore next */ 'dashboard-admin';
const ALLOWED_GAMES = new Set(['coinflip', 'dice', 'roulette', 'crash', 'blackjack', 'slots', 'plinko', 'mines']);
const ALLOWED_AFFILIATE_STATUSES = new Set(['pending', 'active', 'removed']);
const DEFAULT_CTB_CRAWLER_UA = 'ChaseTheBagCrawler';
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
function timingSafeTokenEquals(provided, expected) {
    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(expected);
    if (providedBuf.length !== expectedBuf.length)
        return false;
    return crypto_1.default.timingSafeEqual(providedBuf, expectedBuf);
}
function getConfiguredApiAdmins() {
    const raw = process.env.API_ADMIN_IDS ?? API_ADMIN_ID;
    const ids = raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    return new Set(ids);
}
function getApiActor(req) {
    return req.header('x-admin-user')?.trim() || API_ADMIN_ID;
}
function isLikelyCrawlerUserAgent(userAgent) {
    return /(bot|crawl|crawler|spider|slurp|archiver|facebookexternalhit|wget|curl|python-requests|aiohttp)/i.test(userAgent);
}
function normalizeIp(ip) {
    return ip.replace(/^::ffff:/, '').trim();
}
function getRequestIp(req) {
    if (!trustProxyEnabled) {
        return normalizeIp(req.socket.remoteAddress ?? req.ip ?? '');
    }
    return normalizeIp(req.ip ?? '');
}
function getAllowedCrawlerIps() {
    const raw = process.env.CTB_CRAWLER_ALLOWED_IPS ?? '';
    const ips = raw
        .split(',')
        .map((value) => normalizeIp(value))
        .filter(Boolean);
    return new Set(ips);
}
function isApprovedCtbCrawler(req) {
    const configuredCrawlerUa = (process.env.CTB_CRAWLER_USER_AGENT ?? DEFAULT_CTB_CRAWLER_UA).trim();
    const crawlerKey = (process.env.CTB_CRAWLER_KEY ?? '').trim();
    if (!configuredCrawlerUa || !crawlerKey)
        return false;
    const userAgent = req.header('user-agent') ?? /* istanbul ignore next */ '';
    const providedKey = req.header('x-ctb-crawler-key')?.trim() ?? '';
    const allowedIps = getAllowedCrawlerIps();
    const requestIp = getRequestIp(req);
    const hasAllowedIp = allowedIps.size === 0 || allowedIps.has(requestIp);
    return (userAgent.includes(configuredCrawlerUa) &&
        timingSafeTokenEquals(providedKey, crawlerKey) &&
        hasAllowedIp);
}
function blockUnauthorizedCrawlers(req, res, next) {
    const userAgent = req.header('user-agent') ?? '';
    if (isLikelyCrawlerUserAgent(userAgent) && !isApprovedCtbCrawler(req)) {
        res.status(403).json({ error: 'Crawler access is forbidden.' });
        return;
    }
    next();
}
function authenticateApi(req, res, next) {
    const configuredToken = process.env.API_AUTH_TOKEN?.trim() ?? '';
    if (!configuredToken) {
        res.status(503).json({ error: 'API authentication is not configured on server.' });
        return;
    }
    const token = getProvidedToken(req);
    if (!token || token.length > 512 || !timingSafeTokenEquals(token, configuredToken)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
}
function requireApiAdmin(req, res, next) {
    const actor = getApiActor(req);
    const admins = getConfiguredApiAdmins();
    if (!admins.has(actor)) {
        res.status(403).json({ error: 'Forbidden: admin access required.' });
        return;
    }
    next();
}
async function auditApiAccess(action, req) {
    try {
        const actor = getApiActor(req);
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
app.use('/api', apiLimiter, authenticateApi);
app.use('/api', blockUnauthorizedCrawlers);
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
function shouldUseDbDegradedMode(error) {
    if (process.env.NODE_ENV === 'test')
        return false;
    const message = error instanceof Error ? error.message : String(error ?? '');
    return /(access denied|er_access_denied_error|econnrefused|enotfound|cannot connect|connection)/i.test(message);
}
app.get('/', (_req, res) => {
    res.json({
        service: 'discord-game-server-api',
        status: 'ok',
        docs: '/api/overview',
    });
});
app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
// --- Leaderboard ---
app.get('/api/leaderboard', requireApiAdmin, async (req, res) => {
    try {
        await auditApiAccess('api_view_leaderboard', req);
        const limit = getLimit(req.query.limit, 50, 500);
        const db = await (0, db_1.getDbConnection)();
        const [rows] = await db.execute('SELECT user, score FROM leaderboard ORDER BY score DESC LIMIT ?', [limit]);
        await db.end();
        res.json(rows);
    }
    catch (err) {
        if (shouldUseDbDegradedMode(err)) {
            res.json([]);
            return;
        }
        res.status(500).json({ error: err.message });
    }
});
// --- Game results ---
app.get('/api/game-results', requireApiAdmin, async (req, res) => {
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
        if (shouldUseDbDegradedMode(err)) {
            res.json([]);
            return;
        }
        res.status(500).json({ error: err.message });
    }
});
// --- Affiliates ---
app.get('/api/affiliates', requireApiAdmin, async (req, res) => {
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
        if (shouldUseDbDegradedMode(err)) {
            res.json([]);
            return;
        }
        res.status(500).json({ error: err.message });
    }
});
// --- Codes ---
app.get('/api/codes', sensitiveLimiter, requireApiAdmin, async (req, res) => {
    try {
        await auditApiAccess('api_view_codes', req);
        const limit = getLimit(req.query.limit, 100, 500);
        const db = await (0, db_1.getDbConnection)();
        const [rows] = await db.execute('SELECT code, source, created_at FROM codes ORDER BY created_at DESC LIMIT ?', [limit]);
        await db.end();
        res.json(rows);
    }
    catch (err) {
        if (shouldUseDbDegradedMode(err)) {
            res.json([]);
            return;
        }
        res.status(500).json({ error: err.message });
    }
});
// --- Crawler status ---
app.get('/api/crawler-status', sensitiveLimiter, requireApiAdmin, async (req, res) => {
    try {
        await auditApiAccess('api_view_crawler_status', req);
        res.json((0, crawler_service_1.getStakeCrawlerStatus)());
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Audit log ---
app.get('/api/audit-log', sensitiveLimiter, requireApiAdmin, async (req, res) => {
    try {
        await auditApiAccess('api_view_audit_log', req);
        const limit = getLimit(req.query.limit, 100, 500);
        const db = await (0, db_1.getDbConnection)();
        const [rows] = await db.execute('SELECT id, user_id, server_id, action, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
        await db.end();
        res.json(rows);
    }
    catch (err) {
        if (shouldUseDbDegradedMode(err)) {
            res.json([]);
            return;
        }
        res.status(500).json({ error: err.message });
    }
});
// --- Stats summary ---
app.get('/api/stats', requireApiAdmin, async (_req, res) => {
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
        if (shouldUseDbDegradedMode(err)) {
            res.json({
                players: 0,
                games: 0,
                affiliates: 0,
                codes: 0,
                degraded: true,
            });
            return;
        }
        res.status(500).json({ error: err.message });
    }
});
// --- Advanced analytics overview ---
app.get('/api/overview', requireApiAdmin, async (_req, res) => {
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
        if (shouldUseDbDegradedMode(err)) {
            res.json({
                stats: {
                    players: 0,
                    games: 0,
                    affiliates: 0,
                    codes: 0,
                },
                gameMix: [],
                resultMix: [],
                dailyGames: [],
                degraded: true,
                degradedReason: 'Database unavailable',
                lastUpdated: new Date().toISOString(),
            });
            return;
        }
        res.status(500).json({ error: err.message });
    }
});
// --- Trading Routes ---
app.use('/api/trading', trading_1.default);
// --- Scraper Management Routes ---
app.use('/api/scrapers', scrapers_1.default);
// --- Community Routes ---
app.get('/api/community/leaderboard', apiLimiter, async (req, res) => {
    const category = (['points', 'volume', 'trades', 'profit'].includes(req.query.category)
        ? req.query.category
        : 'points');
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
    const data = await (0, leaderboard_1.getLeaderboard)(category, limit).catch(() => []);
    res.json({ success: true, data });
});
app.get('/api/checkin/status', apiLimiter, async (req, res) => {
    const userId = String(req.header('x-user-id') ?? req.query.userId ?? '');
    if (!userId) {
        res.status(400).json({ success: false, error: 'x-user-id header required' });
        return;
    }
    const status = await (0, checkin_1.getCheckinStatus)(userId).catch(() => null);
    res.json({ success: true, data: status });
});
app.post('/api/checkin', sensitiveLimiter, async (req, res) => {
    const userId = String(req.header('x-user-id') ?? req.body?.userId ?? '');
    if (!userId) {
        res.status(400).json({ success: false, error: 'x-user-id header required' });
        return;
    }
    const result = await (0, checkin_1.performCheckin)(userId).catch((err) => ({ success: false, message: String(err?.message ?? 'error'), pointsAwarded: 0, currentStreak: 0, longestStreak: 0, totalCheckins: 0, alreadyCheckedIn: false }));
    if (result.success || result.alreadyCheckedIn) {
        const newAch = await (0, achievements_1.checkAndAwardAchievements)(userId, { streak: result.currentStreak }).catch(() => []);
        res.json({ success: true, data: { ...result, newAchievements: newAch } });
    }
    else {
        res.status(500).json({ success: false, error: result.message });
    }
});
app.get('/api/achievements', apiLimiter, async (req, res) => {
    const userId = String(req.header('x-user-id') ?? req.query.userId ?? '');
    if (!userId) {
        res.status(400).json({ success: false, error: 'x-user-id header required' });
        return;
    }
    const earned = await (0, achievements_1.getEarnedAchievements)(userId).catch(() => []);
    res.json({ success: true, data: { earned, total: achievements_1.ALL_ACHIEVEMENTS.length, all: achievements_1.ALL_ACHIEVEMENTS } });
});
function startApiServer(port = 3001) {
    app.listen(port, () => {
        console.log(`API server running on http://localhost:${port}`);
    });
}
