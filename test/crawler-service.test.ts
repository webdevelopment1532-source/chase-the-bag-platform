jest.mock('../src/scraper');

import { scrapeStakeCodes } from '../src/scraper';
import {
  getStakeCrawlerStatus,
  startStakeCrawlerService,
  stopStakeCrawlerService,
  triggerStakeCrawlerNow,
} from '../src/crawler-service';

const mockScrape = scrapeStakeCodes as jest.MockedFunction<typeof scrapeStakeCodes>;

describe('crawler-service', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    delete process.env.CTB_CRAWLER_FAILURE_ALERT_THRESHOLD;
    delete process.env.CTB_CRAWLER_SYSTEM_USER_ID;
    stopStakeCrawlerService();
  });

  afterEach(() => {
    stopStakeCrawlerService();
    jest.useRealTimers();
  });

  test('starts active service with immediate crawl trigger', async () => {
    mockScrape.mockResolvedValueOnce([]);

    const status = startStakeCrawlerService({ intervalMs: 1000, actorUserId: 'crawler-1' });
    expect(status.active).toBe(true);

    await Promise.resolve();
    expect(mockScrape).toHaveBeenCalled();
  });

  test('announces codes when scrape returns values', async () => {
    const announce = jest.fn().mockResolvedValue(undefined);
    mockScrape.mockResolvedValueOnce(['CODE1', 'CODE2']);

    startStakeCrawlerService({ intervalMs: 1000, announceCodes: announce });
    await Promise.resolve();

    expect(announce).toHaveBeenCalledWith(['CODE1', 'CODE2']);
  });

  test('manual trigger runs a crawl cycle', async () => {
    mockScrape.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    startStakeCrawlerService({ intervalMs: 1000 });
    await Promise.resolve();

    await triggerStakeCrawlerNow();
    expect(mockScrape).toHaveBeenCalledTimes(2);
  });

  test('status tracks errors without crashing service', async () => {
    mockScrape.mockRejectedValueOnce(new Error('network failed'));

    startStakeCrawlerService({ intervalMs: 1000 });
    await Promise.resolve();

    const status = getStakeCrawlerStatus();
    expect(status.totalErrors).toBeGreaterThanOrEqual(1);
    expect(status.lastError).toContain('network failed');
    expect(status.active).toBe(true);
  });

  test('emits health alert after configured consecutive failures', async () => {
    const healthAlert = jest.fn().mockResolvedValue(undefined);
    mockScrape
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockRejectedValueOnce(new Error('fail-3'));

    startStakeCrawlerService({
      intervalMs: 1000,
      announceHealthAlert: healthAlert,
      failureAlertThreshold: 3,
    });
    await Promise.resolve();
    await triggerStakeCrawlerNow();
    await triggerStakeCrawlerNow();

    expect(healthAlert).toHaveBeenCalledTimes(1);
    const status = getStakeCrawlerStatus();
    expect(status.consecutiveFailures).toBeGreaterThanOrEqual(3);
    expect(status.lastAlertAt).not.toBeNull();
  });

  test('resets failure streak and allows future alerts after success', async () => {
    const healthAlert = jest.fn().mockResolvedValue(undefined);
    mockScrape
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('fail-3'))
      .mockRejectedValueOnce(new Error('fail-4'));

    startStakeCrawlerService({
      intervalMs: 1000,
      announceHealthAlert: healthAlert,
      failureAlertThreshold: 2,
    });
    await Promise.resolve(); // startup immediate run (success)
    await triggerStakeCrawlerNow(); // failure streak 1
    await triggerStakeCrawlerNow(); // failure streak 2 -> first alert
    await triggerStakeCrawlerNow(); // success resets streak
    await triggerStakeCrawlerNow(); // failure streak 1
    await triggerStakeCrawlerNow(); // failure streak 2 -> second alert

    expect(healthAlert).toHaveBeenCalledTimes(2);
  });

  test('stopStakeCrawlerService deactivates crawler', () => {
    mockScrape.mockResolvedValue([]);
    startStakeCrawlerService({ intervalMs: 1000 });

    stopStakeCrawlerService();

    const status = getStakeCrawlerStatus();
    expect(status.active).toBe(false);
    expect(status.running).toBe(false);
  });

  test('starting while already active returns existing status without reinitializing', async () => {
    mockScrape.mockResolvedValue([]);

    const first = startStakeCrawlerService({ intervalMs: 1234, actorUserId: 'first-actor' });
    await Promise.resolve();
    const second = startStakeCrawlerService({ intervalMs: 9999, actorUserId: 'second-actor' });

    expect(first.active).toBe(true);
    expect(second.actorUserId).toBe('first-actor');
    expect(second.intervalMs).toBe(1234);
  });

  test('uses env actor id and defaults threshold to 3 when env threshold invalid', async () => {
    process.env.CTB_CRAWLER_SYSTEM_USER_ID = 'env-actor';
    process.env.CTB_CRAWLER_FAILURE_ALERT_THRESHOLD = 'NaN';
    mockScrape.mockResolvedValue([]);

    const status = startStakeCrawlerService({ intervalMs: 500 });
    await Promise.resolve();

    expect(status.actorUserId).toBe('env-actor');
  });

  test('falls back to default actor id when neither option nor env actor is set', async () => {
    delete process.env.CTB_CRAWLER_SYSTEM_USER_ID;
    mockScrape.mockResolvedValue([]);

    const status = startStakeCrawlerService({ intervalMs: 500 });
    await Promise.resolve();

    expect(status.actorUserId).toBe('ctb-crawler-service');
  });

  test('ignores alert hook delivery errors and keeps crawler active', async () => {
    const healthAlert = jest.fn().mockRejectedValue(new Error('alert send failed'));
    mockScrape
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'));

    startStakeCrawlerService({
      intervalMs: 1000,
      announceHealthAlert: healthAlert,
      failureAlertThreshold: 2,
    });
    await Promise.resolve();
    await triggerStakeCrawlerNow();

    expect(healthAlert).toHaveBeenCalledTimes(1);
    const status = getStakeCrawlerStatus();
    expect(status.active).toBe(true);
    expect(status.totalErrors).toBeGreaterThanOrEqual(2);
  });

  test('sends one health alert per failure streak even across repeated failures', async () => {
    const healthAlert = jest.fn().mockResolvedValue(undefined);
    mockScrape
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockRejectedValueOnce(new Error('fail-3'));

    startStakeCrawlerService({
      intervalMs: 1000,
      announceHealthAlert: healthAlert,
      failureAlertThreshold: 2,
    });
    await Promise.resolve();
    await triggerStakeCrawlerNow();
    await triggerStakeCrawlerNow();

    expect(healthAlert).toHaveBeenCalledTimes(1);
  });

  test('accepts invalid startup interval by falling back to default interval', async () => {
    mockScrape.mockResolvedValue([]);

    const status = startStakeCrawlerService({ intervalMs: -25 });
    await Promise.resolve();

    expect(status.intervalMs).toBe(5 * 60 * 1000);
  });

  test('interval callback triggers recurring crawl cycles', async () => {
    mockScrape.mockResolvedValue([]);

    startStakeCrawlerService({ intervalMs: 1000 });
    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(mockScrape.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('returns early when trigger is called while cycle is already running', async () => {
    mockScrape.mockImplementation(() => new Promise<string[]>(() => undefined));

    startStakeCrawlerService({ intervalMs: 1000 });
    await Promise.resolve();

    await expect(triggerStakeCrawlerNow()).resolves.toBeUndefined();
    expect(mockScrape).toHaveBeenCalledTimes(1);
  });

  test('uses fallback error message when thrown error has no message property', async () => {
    mockScrape.mockRejectedValueOnce({});  // plain object — no .message

    startStakeCrawlerService({ intervalMs: 1000 });
    await Promise.resolve();

    const status = getStakeCrawlerStatus();
    expect(status.lastError).toBe('Crawler cycle failed.');
  });

  test('starts with all defaults when called without options', async () => {
    mockScrape.mockResolvedValue([]);

    const status = startStakeCrawlerService();
    expect(status.active).toBe(true);
  });
});
