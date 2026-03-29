/**
 * Advanced Scraper & Crawler Management API
 * Control, monitor, and configure scraper/crawler behavior with real-time metrics
 */

import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db';

const router = Router();

export interface ScraperConfig {
  id: string;
  name: string;
  enabled: boolean;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retryCount: number;
  retryDelay: number;
  maxConcurrent: number;
  userAgent: string;
  allowedIPs: string[];
  rateLimit: number; // requests per minute
  targetUrl: string;
  selector: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  lastError?: string;
  status: 'active' | 'paused' | 'error' | 'disabled';
}

export interface CrawlerMetrics {
  scraperId: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageRunTime: number;
  lastRunTime?: number;
  itemsCollected: number;
  dataSize: number; // bytes
  errorRate: number;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  consecutiveFailures: number;
  healthScore: number; // 0-100
}

/**
 * GET /api/scrapers
 * List all configured scrapers with their current status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const db = await getDbConnection();
    const query = `
      SELECT s.*, 
             COALESCE(m.totalRuns, 0) as totalRuns,
             COALESCE(m.successfulRuns, 0) as successfulRuns,
             COALESCE(m.failedRuns, 0) as failedRuns,
             COALESCE(m.consecutiveFailures, 0) as consecutiveFailures,
             m.lastSuccessAt,
             m.lastFailureAt
      FROM scrapers s
      LEFT JOIN scraper_metrics m ON s.id = m.scraperId
      ORDER BY s.createdAt DESC
    `;

    const [scrapers] = await db.execute(query);

    res.json({
      success: true,
      data: scrapers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scrapers'
    });
  }
});

/**
 * GET /api/scrapers/:id
 * Get detailed configuration and metrics for a specific scraper
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const db = await getDbConnection();
    const { id } = req.params;

    const [scrapers] = await db.execute(
      'SELECT * FROM scrapers WHERE id = ?',
      [id]
    );

    if ((scrapers as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Scraper not found'
      });
    }

    const scraper = (scrapers as any[])[0];

    // Get metrics
    const [metrics] = await db.execute(
      'SELECT * FROM scraper_metrics WHERE scraperId = ?',
      [id]
    );

    const metric = (metrics as any[])[0];

    // Get recent logs
    const [logs] = await db.execute(
      'SELECT * FROM scraper_logs WHERE scraperId = ? ORDER BY timestamp DESC LIMIT 50',
      [id]
    );

    res.json({
      success: true,
      data: {
        config: scraper,
        metrics: metric || {},
        recentLogs: logs
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scraper details'
    });
  }
});

/**
 * POST /api/scrapers
 * Create a new scraper configuration
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const db = await getDbConnection();
    const {
      name,
      interval,
      timeout,
      retryCount,
      retryDelay,
      maxConcurrent,
      userAgent,
      allowedIPs,
      rateLimit,
      targetUrl,
      selector,
      metadata
    } = req.body;

    const scrapeId = `scraper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO scrapers 
      (id, name, enabled, interval, timeout, retryCount, retryDelay, maxConcurrent,
       userAgent, allowedIPs, rateLimit, targetUrl, selector, metadata, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await db.execute(query, [
      scrapeId,
      name,
      true,
      interval || 300000, // 5 minutes default
      timeout || 10000,
      retryCount || 3,
      retryDelay || 5000,
      maxConcurrent || 5,
      userAgent || 'ChaseTheBagCrawler/1.0',
      JSON.stringify(allowedIPs || ['127.0.0.1']),
      rateLimit || 60,
      targetUrl,
      selector,
      JSON.stringify(metadata || {}),
      'active'
    ]);

    res.json({
      success: true,
      data: { id: scrapeId }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create scraper'
    });
  }
});

/**
 * PATCH /api/scrapers/:id
 * Update scraper configuration
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const db = await getDbConnection();
    const { id } = req.params;
    const updates = req.body;

    let query = 'UPDATE scrapers SET ';
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id' || key === 'createdAt') continue;
      query += `${key} = ?, `;
      values.push(typeof value === 'object' ? JSON.stringify(value) : value);
    }

    query = query.slice(0, -2) + ' WHERE id = ?';
    values.push(id);

    await db.execute(query, values);

    res.json({
      success: true,
      message: 'Scraper updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update scraper'
    });
  }
});

/**
 * POST /api/scrapers/:id/run
 * Manually trigger a scraper run
 */
router.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { id } = req.params;
    const db = await getDbConnection();

    // Record as manual execution in logs
    const logId = `log_${Date.now()}`;
    await db.execute(
      'INSERT INTO scraper_logs (id, scraperId, type, status, startedAt, completedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [logId, id, 'manual', 'pending']
    );

    res.json({
      success: true,
      message: 'Scraper execution triggered',
      logId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to trigger scraper'
    });
  }
});

/**
 * POST /api/scrapers/:id/pause
 * Pause a scraper
 */
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const db = await getDbConnection();
    const { id } = req.params;

    await db.execute('UPDATE scrapers SET status = ?, enabled = 0 WHERE id = ?', ['paused', id]);

    res.json({ success: true, message: 'Scraper paused' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to pause scraper'
    });
  }
});

/**
 * POST /api/scrapers/:id/resume
 * Resume a paused scraper
 */
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const db = await getDbConnection();
    const { id } = req.params;

    await db.execute('UPDATE scrapers SET status = ?, enabled = 1 WHERE id = ?', ['active', id]);

    res.json({ success: true, message: 'Scraper resumed' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resume scraper'
    });
  }
});

/**
 * GET /api/scrapers/:id/logs
 * Get execution logs for a scraper
 */
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const db = await getDbConnection();
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const [logs] = await db.execute(
      'SELECT * FROM scraper_logs WHERE scraperId = ? ORDER BY startedAt DESC LIMIT ? OFFSET ?',
      [id, limit, offset]
    );

    res.json({
      success: true,
      data: logs,
      pagination: { limit, offset }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs'
    });
  }
});

/**
 * GET /api/scrapers/health
 * Get health status dashboard for all scrapers
 */
router.get('/health/dashboard', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const db = await getDbConnection();

    const [stats] = await db.execute(`
      SELECT
        COUNT(*) as totalScrapers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeScrapers,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as pausedScrapers,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errorScrapers,
        SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) as disabledScrapers,
        AVG(consecutiveFailures) as avgConsecutiveFailures,
        MAX(consecutiveFailures) as maxConsecutiveFailures
      FROM scraper_metrics
    `) as any;

    const [recent] = await db.execute(`
      SELECT scraperId, totalRuns, successfulRuns, errorRate
      FROM scraper_metrics
      ORDER BY lastSuccessAt DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        summary: stats?.[0] || {},
        recentScrapers: recent || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health dashboard'
    });
  }
});

/**
 * POST /api/scrapers/:id/config/test
 * Test scraper configuration
 */
router.post('/:id/config/test', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { id } = req.params;
    const db = await getDbConnection();

    const [scrapers] = await db.execute('SELECT * FROM scrapers WHERE id = ?', [id]);
    const scraper = (scrapers as any[])[0];

    if (!scraper) {
      return res.status(404).json({
        success: false,
        error: 'Scraper not found'
      });
    }

    // Test the scraper configuration
    try {
      const controller = new (AbortController as any)();
      /* istanbul ignore next */
      const timeout = setTimeout(() => controller.abort(), scraper.timeout || 10000);

      const response = await fetch(scraper.targetUrl, {
        signal: controller.signal as any
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return res.json({
          success: false,
          error: `HTTP ${response.status}`,
          url: scraper.targetUrl
        });
      }

      const html = await response.text();
      // Basic selector test - would be more complex in production
      const canSelector = /</.test(html);

      res.json({
        success: true,
        data: {
          httpStatus: response.status,
          contentLength: html.length,
          selectorAvailable: canSelector,
          responseTime: response.headers.get('server') || 'unknown'
        }
      });
    } catch (error: any) {
      res.json({
        success: false,
        error: error.message,
        url: scraper.targetUrl
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test configuration'
    });
  }
});

export default router;
