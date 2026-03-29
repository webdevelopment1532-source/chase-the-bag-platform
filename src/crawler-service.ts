import { scrapeStakeCodes } from './scraper';

export interface CrawlerServiceOptions {
  intervalMs?: number;
  actorUserId?: string;
  announceCodes?: (codes: string[]) => Promise<void>;
  announceHealthAlert?: (message: string) => Promise<void>;
  failureAlertThreshold?: number;
}

export interface CrawlerStatus {
  active: boolean;
  running: boolean;
  intervalMs: number;
  actorUserId: string;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  totalRuns: number;
  totalErrors: number;
  totalCodesFound: number;
  consecutiveFailures: number;
  lastAlertAt: string | null;
}

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_ACTOR_ID = 'ctb-crawler-service';

let crawlerTimer: NodeJS.Timeout | null = null;
let crawlerActive = false;
let crawlerRunning = false;
let crawlerIntervalMs = DEFAULT_INTERVAL_MS;
let crawlerActorUserId = DEFAULT_ACTOR_ID;
let lastRunAt: string | null = null;
let lastSuccessAt: string | null = null;
let lastError: string | null = null;
let totalRuns = 0;
let totalErrors = 0;
let totalCodesFound = 0;
let consecutiveFailures = 0;
let lastAlertAt: string | null = null;
let failureAlertThreshold = 3;
let announceCodesHook: ((codes: string[]) => Promise<void>) | null = null;
let announceHealthAlertHook: ((message: string) => Promise<void>) | null = null;
let alertSentForCurrentFailureStreak = false;

async function executeCrawlCycle(): Promise<void> {
  if (crawlerRunning) {
    return;
  }
  crawlerRunning = true;
  totalRuns += 1;
  lastRunAt = new Date().toISOString();

  try {
    const codes = await scrapeStakeCodes({
      actor: {
        userId: crawlerActorUserId,
        isOwner: true,
      },
    });

    totalCodesFound += codes.length;
    lastSuccessAt = new Date().toISOString();
    lastError = null;
    consecutiveFailures = 0;
    alertSentForCurrentFailureStreak = false;

    if (codes.length > 0 && announceCodesHook) {
      await announceCodesHook(codes);
    }
  } catch (error: any) {
    totalErrors += 1;
    consecutiveFailures += 1;
    lastError = error?.message || 'Crawler cycle failed.';

    if (
      announceHealthAlertHook &&
      !alertSentForCurrentFailureStreak &&
      consecutiveFailures >= failureAlertThreshold
    ) {
      const alertMessage =
        `Crawler health alert: ${consecutiveFailures} consecutive failures. ` +
        `Latest error: ${lastError}`;
      try {
        await announceHealthAlertHook(alertMessage);
        alertSentForCurrentFailureStreak = true;
        lastAlertAt = new Date().toISOString();
      } catch {
        // Keep crawler alive even if alert delivery fails.
      }
    }
  } finally {
    crawlerRunning = false;
  }
}

export function startStakeCrawlerService(options: CrawlerServiceOptions = {}): CrawlerStatus {
  if (crawlerActive) {
    return getStakeCrawlerStatus();
  }

  crawlerIntervalMs = Number.isFinite(options.intervalMs) && (options.intervalMs as number) > 0
    ? Math.floor(options.intervalMs as number)
    : DEFAULT_INTERVAL_MS;
  crawlerActorUserId = options.actorUserId?.trim() || process.env.CTB_CRAWLER_SYSTEM_USER_ID || DEFAULT_ACTOR_ID;
  failureAlertThreshold = Number.isFinite(options.failureAlertThreshold)
    && (options.failureAlertThreshold as number) > 0
    ? Math.floor(options.failureAlertThreshold as number)
    : Number(process.env.CTB_CRAWLER_FAILURE_ALERT_THRESHOLD ?? 3);
  if (!Number.isFinite(failureAlertThreshold) || failureAlertThreshold < 1) {
    failureAlertThreshold = 3;
  }
  announceCodesHook = options.announceCodes ?? null;
  announceHealthAlertHook = options.announceHealthAlert ?? null;

  crawlerActive = true;
  crawlerTimer = setInterval(() => {
    void executeCrawlCycle();
  }, crawlerIntervalMs);

  // Run immediately once so the service is productive right after startup.
  void executeCrawlCycle();

  return getStakeCrawlerStatus();
}

export function stopStakeCrawlerService(): void {
  if (crawlerTimer) {
    clearInterval(crawlerTimer);
    crawlerTimer = null;
  }
  crawlerActive = false;
  crawlerRunning = false;
}

export function triggerStakeCrawlerNow(): Promise<void> {
  return executeCrawlCycle();
}

export function getStakeCrawlerStatus(): CrawlerStatus {
  return {
    active: crawlerActive,
    running: crawlerRunning,
    intervalMs: crawlerIntervalMs,
    actorUserId: crawlerActorUserId,
    lastRunAt,
    lastSuccessAt,
    lastError,
    totalRuns,
    totalErrors,
    totalCodesFound,
    consecutiveFailures,
    lastAlertAt,
  };
}