// @ts-nocheck
import fetch from 'node-fetch';
import { getDbConnection } from '../src/db';
import { logOperation } from '../src/audit-log';
import { generateSelfCode, scrapeStakeCodes } from '../src/scraper';

jest.mock('../src/db', () => ({
  getDbConnection: jest.fn(),
}));

jest.mock('../src/audit-log', () => ({
  logOperation: jest.fn(),
}));

describe('scraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty list and does not open db connection when no promo codes exist', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValue({
      text: async () => '<html><body><div class="other">none</div></body></html>',
    });

    const codes = await scrapeStakeCodes();

    expect(codes).toEqual([]);
    expect(getDbConnection).not.toHaveBeenCalled();
    expect(logOperation).not.toHaveBeenCalled();
  });

  it('stores and logs each scraped promo code', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValue({
      text: async () =>
        '<div class="promo-code"> ALPHA1 </div><div class="promo-code">BETA2</div>',
    });

    const execute = jest.fn().mockResolvedValue([[], []]);
    (getDbConnection as jest.Mock).mockResolvedValue({ execute });

    const codes = await scrapeStakeCodes();

    expect(codes).toEqual(['ALPHA1', 'BETA2']);
    expect(getDbConnection).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenNthCalledWith(
      1,
      'INSERT IGNORE INTO codes (code, source) VALUES (?, ?)',
      ['ALPHA1', 'stake.us']
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      'INSERT IGNORE INTO codes (code, source) VALUES (?, ?)',
      ['BETA2', 'stake.us']
    );
    expect(logOperation).toHaveBeenCalledTimes(2);
    expect(logOperation).toHaveBeenNthCalledWith(1, {
      userId: 'system',
      serverId: 'system',
      action: 'scrape_code',
      details: 'Scraped code: ALPHA1',
    });
    expect(logOperation).toHaveBeenNthCalledWith(2, {
      userId: 'system',
      serverId: 'system',
      action: 'scrape_code',
      details: 'Scraped code: BETA2',
    });
    expect(fetch).toHaveBeenCalledWith('https://stake.us/');
  });
});

describe('generateSelfCode', () => {
  it('should generate a code with the correct prefix and length', () => {
    const code = generateSelfCode('TEST', 6);
    expect(code.startsWith('TEST-')).toBe(true);
    expect(code.length).toBe(11); // 'TEST-' + 6 chars
  });

  it('uses defaults when prefix and length are omitted', () => {
    const code = generateSelfCode();
    expect(code.startsWith('CYBER44-')).toBe(true);
    expect(code).toHaveLength(16);
  });

  it('uses only allowed uppercase characters after the hyphen', () => {
    const code = generateSelfCode('CYBER44', 12);
    expect(code).toMatch(/^CYBER44-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
  });

  it('uses deterministic char index math for generated codes', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const code = generateSelfCode('TEST', 1);
    expect(code).toBe('TEST-S');
    randomSpy.mockRestore();
  });
});
