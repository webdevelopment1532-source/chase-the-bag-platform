import {
  assertAuthorizedScraper,
  assertPayoutEligible,
  calculateStakeDropRouting,
  isAuthorizedScraper,
  isPayoutEligible,
} from '../src/payout-policy';

describe('payout policy', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.CTB_MAIN_HOT_WALLET_ADDRESS = 'main-wallet-addr';
    process.env.CTB_EXCHANGE_HOT_WALLET_ADDRESS = 'exchange-wallet-addr';
    process.env.CTB_MAIN_WALLET_SPLIT_PERCENT = '70';
    delete process.env.CTB_ALLOWED_SCRAPER_IDS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('allows payout for game participants', () => {
    expect(isPayoutEligible({ userId: 'u1', isInGame: true })).toBe(true);
  });

  test('denies payout for users outside game/live/admin/owner', () => {
    expect(isPayoutEligible({ userId: 'u2' })).toBe(false);
    expect(() => assertPayoutEligible({ userId: 'u2' })).toThrow('Payouts are restricted');
  });

  test('assertPayoutEligible does not throw for an eligible user', () => {
    expect(() => assertPayoutEligible({ userId: 'u-eligible', isInLive: true })).not.toThrow();
  });

  test('allows scraping by admin', () => {
    expect(isAuthorizedScraper({ userId: 'admin', isAdmin: true })).toBe(true);
  });

  test('allows scraping by owner and does not throw in assertAuthorizedScraper', () => {
    const context = { userId: 'owner-user', isOwner: true };
    expect(isAuthorizedScraper(context)).toBe(true);
    expect(() => assertAuthorizedScraper(context)).not.toThrow();
  });

  test('enforces allow-list for scraping when configured', () => {
    process.env.CTB_ALLOWED_SCRAPER_IDS = 'allowed1,allowed2';
    expect(isAuthorizedScraper({ userId: 'allowed2' })).toBe(true);
    expect(() => assertAuthorizedScraper({ userId: 'not-allowed' })).toThrow('Scraping for payout is restricted');
  });

  test('denies scrape access for game/live users unless explicitly allowlisted', () => {
    process.env.CTB_ALLOWED_SCRAPER_IDS = 'trusted-operator';
    expect(isAuthorizedScraper({ userId: 'game-user', isInGame: true })).toBe(false);
    expect(isAuthorizedScraper({ userId: 'live-user', isInLive: true })).toBe(false);
    expect(isAuthorizedScraper({ userId: 'trusted-operator', isInGame: true })).toBe(true);
  });

  test('calculates main and exchange routing with exchange fee added', () => {
    const routing = calculateStakeDropRouting(10, 0.5);
    expect(routing.toMainWallet).toBe(7);
    expect(routing.toExchangeWallet).toBe(3.5);
    expect(routing.mainWalletAddress).toBe('main-wallet-addr');
    expect(routing.exchangeWalletAddress).toBe('exchange-wallet-addr');
  });

  test('throws on invalid drop amount', () => {
    expect(() => calculateStakeDropRouting(0, 0)).toThrow('Stake drop amount must be a positive number.');
  });

  test('throws on negative exchange fee', () => {
    expect(() => calculateStakeDropRouting(10, -0.1)).toThrow('Exchange fee must be zero or a positive number.');
  });

  test('throws when split percent is invalid', () => {
    process.env.CTB_MAIN_WALLET_SPLIT_PERCENT = '120';
    expect(() => calculateStakeDropRouting(10, 0)).toThrow('CTB_MAIN_WALLET_SPLIT_PERCENT must be between 0 and 100.');
  });

  test('throws when split percent is not a finite number', () => {
    process.env.CTB_MAIN_WALLET_SPLIT_PERCENT = 'NaN';
    expect(() => calculateStakeDropRouting(10, 0)).toThrow('CTB_MAIN_WALLET_SPLIT_PERCENT must be between 0 and 100.');
  });

  test('throws when wallet env vars are missing', () => {
    delete process.env.CTB_MAIN_HOT_WALLET_ADDRESS;
    expect(() => calculateStakeDropRouting(10, 0)).toThrow('Missing required environment variable: CTB_MAIN_HOT_WALLET_ADDRESS');
  });

  test('uses default split of 70 and default exchange fee of 0 when both are absent', () => {
    delete process.env.CTB_MAIN_WALLET_SPLIT_PERCENT;
    const routing = calculateStakeDropRouting(10);
    expect(routing.toMainWallet).toBe(7);
    expect(routing.toExchangeWallet).toBe(3);
    expect(routing.totalDrop).toBe(10);
  });
});
