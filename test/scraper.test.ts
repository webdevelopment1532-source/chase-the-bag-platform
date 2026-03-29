jest.mock('../src/db');
jest.mock('../src/audit-log');
jest.mock('node-fetch');
jest.mock('cheerio', () => ({
  load: jest.fn(),
}));

import { getDbConnection } from '../src/db';
import { logOperation } from '../src/audit-log';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { generateSelfCode, scrapeStakeCodes } from '../src/scraper';

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const cheerioMock = jest.requireMock('cheerio') as { load: jest.Mock };
const mockExecute = jest.fn().mockResolvedValue([[]]);
const mockConn = { execute: mockExecute, end: jest.fn().mockResolvedValue(undefined) };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;
const mockLog = logOperation as jest.MockedFunction<typeof logOperation>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockConn as any);
  mockLog.mockResolvedValue(undefined);
});

describe('generateSelfCode', () => {
  test('generates code with default prefix and length', () => {
    const code = generateSelfCode();
    expect(code.startsWith('CYBER44-')).toBe(true);
    expect(code.length).toBe('CYBER44-'.length + 8);
  });

  test('generates code with custom prefix', () => {
    const code = generateSelfCode('TEST', 6);
    expect(code.startsWith('TEST-')).toBe(true);
    expect(code.length).toBe('TEST-'.length + 6);
  });

  test('generated code suffix only contains allowed characters', () => {
    const allowedChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    const code = generateSelfCode('PFX', 10);
    const suffix = code.split('-')[1];
    expect(allowedChars.test(suffix)).toBe(true);
  });

  test('each call produces a different code (high probability)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateSelfCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('scrapeStakeCodes', () => {
  test('returns empty array when no promo codes found on page', async () => {
    const mockResponse = { text: jest.fn().mockResolvedValue('<html></html>') };
    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const mockEach = jest.fn();
    const mockDollar = jest.fn().mockReturnValue({ each: mockEach });
    cheerioMock.load.mockReturnValue(mockDollar);

    const codes = await scrapeStakeCodes({ actor: { userId: 'allowed', isAdmin: true } });
    expect(codes).toEqual([]);
  });

  test('fetches from stake.us', async () => {
    const mockResponse = { text: jest.fn().mockResolvedValue('<html></html>') };
    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const mockEach = jest.fn();
    const mockDollar = jest.fn().mockReturnValue({ each: mockEach });
    cheerioMock.load.mockReturnValue(mockDollar);

    await scrapeStakeCodes({ actor: { userId: 'allowed', isAdmin: true } });
    expect(mockFetch).toHaveBeenCalledWith('https://stake.us/');
  });

  test('stores found codes in the database', async () => {
    const mockResponse = { text: jest.fn().mockResolvedValue('<html></html>') };
    mockFetch.mockResolvedValueOnce(mockResponse as any);

    // Simulate cheerio finding 2 promo-code elements
    const mockText = jest.fn()
      .mockReturnValueOnce('CODE1')
      .mockReturnValueOnce('CODE2');
    const mockEl1 = {};
    const mockEl2 = {};
    const mockEach = jest.fn().mockImplementation((cb: Function) => {
      cb(0, mockEl1);
      cb(1, mockEl2);
    });
    const mockDollarResult = { text: mockText, each: mockEach };
    const mockDollar = jest.fn().mockReturnValue(mockDollarResult);
    cheerioMock.load.mockReturnValue(mockDollar);

    const codes = await scrapeStakeCodes({ actor: { userId: 'allowed', isAdmin: true } });
    expect(codes).toEqual(['CODE1', 'CODE2']);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  test('rejects unauthorized scraper actor', async () => {
    const mockResponse = { text: jest.fn().mockResolvedValue('<html></html>') };
    mockFetch.mockResolvedValueOnce(mockResponse as any);
    cheerioMock.load.mockReturnValue(jest.fn().mockReturnValue({ each: jest.fn() }));

    await expect(scrapeStakeCodes({ actor: { userId: 'random-user' } })).rejects.toThrow(
      'Scraping for payout is restricted to authorized game/live operators.',
    );
  });

  test('allows scraping when access enforcement is disabled', async () => {
    const mockResponse = { text: jest.fn().mockResolvedValue('<html></html>') };
    mockFetch.mockResolvedValueOnce(mockResponse as any);
    cheerioMock.load.mockReturnValue(jest.fn().mockReturnValue({ each: jest.fn() }));

    const codes = await scrapeStakeCodes({ enforceAccess: false });
    expect(codes).toEqual([]);
  });

  test('uses default actor when no options are provided and system scraper is allowed', async () => {
    process.env.CTB_ALLOW_SYSTEM_SCRAPER = 'true';
    const mockResponse = { text: jest.fn().mockResolvedValue('<html></html>') };
    mockFetch.mockResolvedValueOnce(mockResponse as any);
    cheerioMock.load.mockReturnValue(jest.fn().mockReturnValue({ each: jest.fn() }));

    const codes = await scrapeStakeCodes();
    expect(codes).toEqual([]);
  });
});
