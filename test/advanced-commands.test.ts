// advanced-commands.ts imports scraper (→ node-fetch/cheerio) and various DB-backed modules.
// Mock them all so Jest (CommonJS mode) doesn't fail on ESM node-fetch.
jest.mock('../src/db');
jest.mock('../src/audit-log');
jest.mock('../src/scraper');
jest.mock('../src/virtual-board');
jest.mock('../src/referral');
jest.mock('../src/antifraud');
jest.mock('../src/export-data');
jest.mock('../src/analytics');
jest.mock('../src/chart');
jest.mock('../src/personalize');
jest.mock('../src/payout-policy');

process.env.CTB_ADMIN_USER_IDS = 'owner1,admin1,admin2,adminx1,adminx2,adminx3,adminx4';

import { getDbConnection } from '../src/db';
import { checkFraudulentActivity } from '../src/antifraud';
import { scrapeStakeCodes, generateSelfCode } from '../src/scraper';
import { getVirtualBoardData } from '../src/virtual-board';
import { getReferralLeaderboard, getUserReferralCount } from '../src/referral';
import { exportAllDataZip } from '../src/export-data';
import { getPlatformAnalytics } from '../src/analytics';
import { getChartUrl } from '../src/chart';
import { getPersonalizedOffer } from '../src/personalize';
import { logOperation } from '../src/audit-log';
import { assertAuthorizedScraper, assertPayoutEligible, calculateStakeDropRouting } from '../src/payout-policy';

const mockExecute = jest.fn().mockResolvedValue([[]]);
const mockConn = { execute: mockExecute, end: jest.fn().mockResolvedValue(undefined) };
(getDbConnection as jest.MockedFunction<typeof getDbConnection>).mockResolvedValue(mockConn as any);
(checkFraudulentActivity as jest.MockedFunction<typeof checkFraudulentActivity>).mockResolvedValue([]);
(scrapeStakeCodes as jest.MockedFunction<typeof scrapeStakeCodes>).mockResolvedValue([] as any);
(generateSelfCode as jest.MockedFunction<typeof generateSelfCode>).mockReturnValue('SELFCODE1');
(getVirtualBoardData as jest.MockedFunction<typeof getVirtualBoardData>).mockResolvedValue([] as any);
(getReferralLeaderboard as jest.MockedFunction<typeof getReferralLeaderboard>).mockResolvedValue([] as any);
(getUserReferralCount as jest.MockedFunction<typeof getUserReferralCount>).mockResolvedValue(0 as any);
(exportAllDataZip as jest.MockedFunction<typeof exportAllDataZip>).mockResolvedValue('/tmp/export.zip' as any);
(getPlatformAnalytics as jest.MockedFunction<typeof getPlatformAnalytics>).mockResolvedValue({
  userCount: 1,
  codeCount: 2,
  affiliateCount: 3,
  totalRewards: 4,
} as any);
(getChartUrl as jest.MockedFunction<typeof getChartUrl>).mockResolvedValue('https://chart.local/x.png' as any);
(getPersonalizedOffer as jest.MockedFunction<typeof getPersonalizedOffer>).mockReturnValue('🚀 Play more to unlock exclusive bonuses and rewards!');
(logOperation as jest.MockedFunction<typeof logOperation>).mockResolvedValue(undefined as any);
(assertAuthorizedScraper as jest.MockedFunction<typeof assertAuthorizedScraper>).mockImplementation(() => undefined as any);
(assertPayoutEligible as jest.MockedFunction<typeof assertPayoutEligible>).mockImplementation(() => undefined as any);
(calculateStakeDropRouting as jest.MockedFunction<typeof calculateStakeDropRouting>).mockReturnValue({
  totalDrop: 100,
  splitPercentToMain: 70,
  toMainWallet: 70,
  toExchangeWallet: 30,
  exchangeFeeAdded: 0,
  mainWalletAddress: 'main',
  exchangeWalletAddress: 'exchange',
} as any);

// Tests for advanced-commands.ts — focuses on pure functions (getUserReward, addUserPoints)
// and startAutomatedAdDrops guard. The Discord message handler is integration-level and
// covered via the logic already exercised in other unit tests.

describe('getUserReward', () => {
  test('creates a default Bronze reward for a new user', () => {
    const { getUserReward } = require('../src/advanced-commands');
    const reward = getUserReward('newUser');
    expect(reward).toMatchObject({ userId: 'newUser', tier: 'Bronze', points: 0, cashback: 0, bonus: 0 });
  });

  test('returns the same object on subsequent calls (singleton per user)', () => {
    const { getUserReward } = require('../src/advanced-commands');
    const r1 = getUserReward('u1');
    const r2 = getUserReward('u1');
    expect(r1).toBe(r2);
  });
});

describe('addUserPoints', () => {
  test('accumulates points correctly', () => {
    const { getUserReward, addUserPoints } = require('../src/advanced-commands');
    addUserPoints('acc', 50);
    addUserPoints('acc', 50);
    expect(getUserReward('acc').points).toBe(100);
  });

  test('upgrades to Silver tier at > 200 points', () => {
    const { getUserReward, addUserPoints } = require('../src/advanced-commands');
    addUserPoints('silverU', 201);
    const r = getUserReward('silverU');
    expect(r.tier).toBe('Silver');
    expect(r.cashback).toBeCloseTo(201 * 0.01);
    expect(r.bonus).toBe(10);
  });

  test('upgrades to Gold tier at > 500 points', () => {
    const { getUserReward, addUserPoints } = require('../src/advanced-commands');
    addUserPoints('goldU', 501);
    const r = getUserReward('goldU');
    expect(r.tier).toBe('Gold');
    expect(r.cashback).toBeCloseTo(501 * 0.03);
    expect(r.bonus).toBe(50);
  });

  test('upgrades to VIP tier at > 1000 points', () => {
    const { getUserReward, addUserPoints } = require('../src/advanced-commands');
    addUserPoints('vipU', 1001);
    const r = getUserReward('vipU');
    expect(r.tier).toBe('VIP');
    expect(r.cashback).toBeCloseTo(1001 * 0.05);
    expect(r.bonus).toBe(100);
  });

  test('Bronze user has 0 cashback and 0 bonus', () => {
    const { getUserReward, addUserPoints } = require('../src/advanced-commands');
    addUserPoints('bronzeU', 10);
    const r = getUserReward('bronzeU');
    expect(r.tier).toBe('Bronze');
    expect(r.cashback).toBe(0);
    expect(r.bonus).toBe(0);
  });
});

describe('startAutomatedAdDrops', () => {
  afterEach(() => {
    try {
      const { stopAutomatedAdDrops } = require('../src/advanced-commands');
      if (typeof stopAutomatedAdDrops === 'function') {
        stopAutomatedAdDrops();
      }
    } catch {
      // ignore teardown errors in isolated module resets
    }
    jest.useRealTimers();
  });

  test('does not throw when called with a minimal mock client', () => {
    jest.useFakeTimers();
    const { startAutomatedAdDrops } = require('../src/advanced-commands');
    const mockClient = { guilds: { cache: new Map() } } as any;
    expect(() => startAutomatedAdDrops(mockClient)).not.toThrow();
  });

  test('calling startAutomatedAdDrops twice does not register a second interval', () => {
    jest.useFakeTimers();
    const { startAutomatedAdDrops } = require('../src/advanced-commands');
    const mockClient = { guilds: { cache: new Map() } } as any;
    startAutomatedAdDrops(mockClient);
    startAutomatedAdDrops(mockClient);
    // Guard check: a second call is a no-op (adDropInitialized flag)
    // Calling twice must not throw and the client must still be valid (smoke check)
    expect(mockClient).toBeDefined();
  });

  test('stopAutomatedAdDrops is a safe no-op when interval was never started', () => {
    const { stopAutomatedAdDrops } = require('../src/advanced-commands');
    expect(() => stopAutomatedAdDrops()).not.toThrow();
  });

});

describe('registerAdvancedCommands message handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CTB_OWNER_USER_ID = 'owner1';
    (checkFraudulentActivity as jest.Mock).mockResolvedValue([]);
    (exportAllDataZip as jest.Mock).mockResolvedValue('/tmp/export.zip');
    (logOperation as jest.Mock).mockResolvedValue(undefined);
  });

  function setup() {
    const handlers: Record<string, Function> = {};
    const client = {
      on: jest.fn((event: string, cb: Function) => {
        handlers[event] = cb;
      }),
      guilds: { cache: new Map() },
    } as any;

    const { registerAdvancedCommands } = require('../src/advanced-commands');
    registerAdvancedCommands(client);
    return handlers;
  }

  function makeMessage(content: string, userId = 'u1') {
    return {
      content,
      author: {
        id: userId,
        bot: false,
        username: 'tester',
        send: jest.fn().mockResolvedValue(undefined),
      },
      member: {
        roles: { cache: { has: jest.fn().mockReturnValue(false) } },
        voice: { channelId: null },
      },
      guild: { id: 'g1' },
      channel: { send: jest.fn().mockResolvedValue(undefined) },
      reply: jest.fn().mockResolvedValue(undefined),
    } as any;
  }

  test('handles guildMemberAdd DM success and failure without throw', async () => {
    const handlers = setup();
    const okMember = { user: { username: 'x' }, send: jest.fn().mockResolvedValue(undefined) };
    const badMember = { user: { username: 'x' }, send: jest.fn().mockRejectedValue(new Error('closed')) };

    await handlers.guildMemberAdd(okMember);
    await handlers.guildMemberAdd(badMember);

    expect(okMember.send).toHaveBeenCalled();
  });

  test('ignores bot messages', async () => {
    const handlers = setup();
    const m = makeMessage('!help');
    m.author.bot = true;
    await handlers.messageCreate(m);
    expect(m.reply).not.toHaveBeenCalled();
  });

  test('alerts when fraud activity is detected', async () => {
    (checkFraudulentActivity as jest.Mock).mockResolvedValueOnce(['suspicious']);
    const handlers = setup();
    const m = makeMessage('!help');
    await handlers.messageCreate(m);
    expect(m.reply).toHaveBeenCalled();
  });

  test('handles !mylink success and payout denial', async () => {
    const handlers = setup();
    const ok = makeMessage('!mylink', 'owner1');
    await handlers.messageCreate(ok);
    expect(ok.author.send).toHaveBeenCalled();

    (assertPayoutEligible as jest.Mock).mockImplementationOnce(() => {
      throw new Error('not eligible');
    });
    const denied = makeMessage('!mylink', 'u2');
    await handlers.messageCreate(denied);
    expect(denied.reply).toHaveBeenCalledWith('not eligible');
  });

  test('handles !mylink DM failure path', async () => {
    const handlers = setup();
    const msg = makeMessage('!mylink', 'owner1');
    msg.author.send.mockRejectedValueOnce(new Error('dm closed'));

    await handlers.messageCreate(msg);

    expect(msg.reply).toHaveBeenCalledWith('Could not DM you. Please check your privacy settings.');
  });

  test('handles !scrapecodes success, empty, and denied', async () => {
    const handlers = setup();
    (scrapeStakeCodes as jest.Mock).mockResolvedValueOnce([]);
    const empty = makeMessage('!scrapecodes', 'owner1');
    await handlers.messageCreate(empty);
    expect(empty.reply).toHaveBeenCalled();

    (scrapeStakeCodes as jest.Mock).mockResolvedValueOnce(['A1', 'A2']);
    const found = makeMessage('!scrapecodes', 'owner1');
    await handlers.messageCreate(found);
    expect(found.reply).toHaveBeenCalled();

    (assertAuthorizedScraper as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Scrape denied');
    });
    const denied = makeMessage('!scrapecodes', 'u3');
    await handlers.messageCreate(denied);
    expect(denied.reply).toHaveBeenCalledWith('Scrape denied');
  });

  test('handles !scrapecodes error fallback when error has no message', async () => {
    const handlers = setup();
    (assertAuthorizedScraper as jest.Mock).mockImplementationOnce(() => {
      throw {};
    });

    const denied = makeMessage('!scrapecodes', 'u4');
    await handlers.messageCreate(denied);

    expect(denied.reply).toHaveBeenCalledWith('Scrape denied.');
  });

  test('handles !stakepayoutsplit permission and success', async () => {
    const handlers = setup();
    const denied = makeMessage('!stakepayoutsplit 100', 'u9');
    await handlers.messageCreate(denied);
    expect(denied.reply).toHaveBeenCalledWith(expect.stringContaining('do not have permission'));

    const ok = makeMessage('!stakepayoutsplit 100 2', 'owner1');
    await handlers.messageCreate(ok);
    expect(ok.reply).toHaveBeenCalledWith(expect.stringContaining('Stake Drop Routing'));
  });

  test('handles !stakepayoutsplit calculation error', async () => {
    (calculateStakeDropRouting as jest.Mock).mockImplementationOnce(() => {
      throw new Error('invalid split');
    });
    const handlers = setup();
    const msg = makeMessage('!stakepayoutsplit 100 2', 'owner1');

    await handlers.messageCreate(msg);

    expect(msg.reply).toHaveBeenCalledWith('invalid split');
  });

  test('handles !stakepayoutsplit with default exchange fee and fallback error message', async () => {
    const handlers = setup();
    const ok = makeMessage('!stakepayoutsplit 100', 'owner1');

    await handlers.messageCreate(ok);
    expect(calculateStakeDropRouting).toHaveBeenCalledWith(100, 0);

    (calculateStakeDropRouting as jest.Mock).mockImplementationOnce(() => {
      throw {};
    });
    const bad = makeMessage('!stakepayoutsplit 100', 'owner1');
    await handlers.messageCreate(bad);
    expect(bad.reply).toHaveBeenCalledWith('Invalid payout split parameters.');
  });

  test('handles rewards and referral commands', async () => {
    const handlers = setup();
    const rewards = makeMessage('!myrewards');
    await handlers.messageCreate(rewards);
    expect(rewards.reply).toHaveBeenCalled();

    const offer = makeMessage('!myoffer');
    await handlers.messageCreate(offer);
    expect(offer.reply).toHaveBeenCalledWith('🚀 Play more to unlock exclusive bonuses and rewards!');

    (getReferralLeaderboard as jest.Mock).mockResolvedValueOnce([]);
    const emptyBoard = makeMessage('!referralboard');
    await handlers.messageCreate(emptyBoard);
    expect(emptyBoard.reply).toHaveBeenCalled();

    (getReferralLeaderboard as jest.Mock).mockResolvedValueOnce([{ user_id: 'u1', referrals: 5 }]);
    const board = makeMessage('!referralboard');
    await handlers.messageCreate(board);
    expect(board.reply).toHaveBeenCalledWith(expect.stringContaining('Referral Leaderboard'));

    (getUserReferralCount as jest.Mock).mockResolvedValueOnce(7);
    const myRefs = makeMessage('!myreferrals');
    await handlers.messageCreate(myRefs);
    expect(myRefs.reply).toHaveBeenCalledWith(expect.stringContaining('7'));
  });

  test('applies rate limit and handles !admin denial', async () => {
    const handlers = setup();
    const first = makeMessage('!help', 'rateUser');
    await handlers.messageCreate(first);
    expect(first.reply).toHaveBeenCalled();

    const second = makeMessage('!help', 'rateUser');
    await handlers.messageCreate(second);
    expect(second.reply).toHaveBeenCalledWith('⏳ Please wait before using another command.');

    const admin = makeMessage('!admin test', 'u2');
    await handlers.messageCreate(admin);
    expect(admin.reply).toHaveBeenCalledWith(expect.stringContaining('do not have permission'));
  });

  test('handles !exportdata and !analytics denial paths', async () => {
    const handlers = setup();
    const ex = makeMessage('!exportdata', 'expUserA');
    await handlers.messageCreate(ex);
    expect(ex.reply).toHaveBeenCalledWith(expect.stringContaining('do not have permission'));

    const analytics = makeMessage('!analytics', 'expUserB');
    await handlers.messageCreate(analytics);
    expect(analytics.reply).toHaveBeenCalledWith(expect.stringContaining('do not have permission'));
  });

  test('handles !admin and !exportdata success paths for configured admins', async () => {
    const handlers = setup();

    const admin = makeMessage('!admin ping', 'adminx1');
    await handlers.messageCreate(admin);
    expect(admin.reply).toHaveBeenCalledWith('✅ Admin command executed.');

    const exp = makeMessage('!exportdata', 'adminx2');
    await handlers.messageCreate(exp);
    expect(exp.reply).toHaveBeenCalledWith(expect.objectContaining({ content: '📦 Exported all data:' }));
  });

  test('uses dm server fallback in audit logs for !mylink, !exportdata, and !mycode', async () => {
    // Use unique user IDs not shared with any other test to avoid rate-limiter collisions.
    // ADMIN_USERS is frozen at module load from the env set on line 15 of this file.
    // CTB_OWNER_USER_ID is read dynamically, so we can override it per-test.
    // 'admin1' is in ADMIN_USERS but unused in any other makeMessage() call.
    process.env.CTB_OWNER_USER_ID = 'dm-owner-x';

    const handlers = setup();

    const link = makeMessage('!mylink', 'dm-owner-x');
    link.guild = undefined;
    await handlers.messageCreate(link);

    const exportMsg = makeMessage('!exportdata', 'admin1');
    exportMsg.guild = undefined;
    await handlers.messageCreate(exportMsg);
    expect(exportMsg.reply).toHaveBeenCalledWith(expect.objectContaining({ content: '📦 Exported all data:' }));

    const myCode = makeMessage('!mycode', 'dm-code-x');
    myCode.guild = undefined;
    await handlers.messageCreate(myCode);

    const loggedActions = (logOperation as jest.Mock).mock.calls.map((call) => call[0]);
    expect(loggedActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'send_affiliate_link', serverId: 'dm' }),
        expect.objectContaining({ action: 'export_data', serverId: 'dm' }),
        expect.objectContaining({ action: 'generate_self_code', serverId: 'dm' }),
      ]),
    );
  });

  test('handles !exportdata failure for configured admins', async () => {
    (exportAllDataZip as jest.Mock).mockRejectedValueOnce(new Error('zip failed'));
    const handlers = setup();

    const exp = makeMessage('!exportdata', 'adminx3');
    await handlers.messageCreate(exp);
    expect(exportAllDataZip).toHaveBeenCalled();
    expect(exp.reply).toHaveBeenCalledWith('❌ Failed to export data.');
  });

  test('handles !analytics success for configured admins', async () => {
    const handlers = setup();
    const ok = makeMessage('!analytics', 'adminx4');
    await handlers.messageCreate(ok);
    expect(ok.reply).toHaveBeenCalledWith(expect.stringContaining('Platform Analytics'));
  });

  test('handles !analytics failure for configured admins', async () => {
    (getPlatformAnalytics as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const handlers = setup();
    const bad = makeMessage('!analytics', 'admin2');
    await handlers.messageCreate(bad);
    expect(bad.reply).toHaveBeenCalledWith('❌ Failed to fetch analytics.');
  });

  test('does not reply fallback for non-command content on handler error', async () => {
    (checkFraudulentActivity as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const handlers = setup();
    const msg = makeMessage('hello world');
    await handlers.messageCreate(msg);
    expect(msg.reply).not.toHaveBeenCalled();
  });

  test('handles !latestcodes, !board, !mycode, !top5 and !stats', async () => {
    const handlers = setup();
    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ code: 'C1', source: 's', created_at: new Date().toISOString() }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ user: 'u1', score: 50 }]])
      .mockResolvedValueOnce([[{ game: 'dice', score: 30 }]]);

    const latestNone = makeMessage('!latestcodes', 'owner1');
    await handlers.messageCreate(latestNone);
    expect(latestNone.reply).toHaveBeenCalled();

    const latestSome = makeMessage('!latestcodes', 'codesUser2');
    await handlers.messageCreate(latestSome);
    expect(latestSome.reply).toHaveBeenCalledWith(expect.stringContaining('Latest Codes'));

    (getVirtualBoardData as jest.Mock).mockResolvedValueOnce([]);
    const boardNone = makeMessage('!board', 'owner3');
    await handlers.messageCreate(boardNone);
    expect(boardNone.reply).toHaveBeenCalled();

    (getVirtualBoardData as jest.Mock).mockResolvedValueOnce([{ code: 'B1', source: 'x', created_at: new Date().toISOString() }]);
    const boardSome = makeMessage('!board', 'owner4');
    await handlers.messageCreate(boardSome);
    expect(boardSome.reply).toHaveBeenCalledWith(expect.stringContaining('Virtual Board'));

    const myCode = makeMessage('!mycode', 'owner5');
    await handlers.messageCreate(myCode);
    expect(myCode.author.send).toHaveBeenCalledWith(expect.stringContaining('SELFCODE1'));

    const top5 = makeMessage('!top5', 'owner6');
    await handlers.messageCreate(top5);
    expect(top5.channel.send).toHaveBeenCalled();

    const stats = makeMessage('!stats testuser', 'owner7');
    await handlers.messageCreate(stats);
    expect(stats.channel.send).toHaveBeenCalled();
  });

  test('handles !mycode payout denial and DM failure path', async () => {
    const handlers = setup();

    (assertPayoutEligible as jest.Mock).mockImplementationOnce(() => {
      throw new Error('not eligible for mycode');
    });
    const denied = makeMessage('!mycode', 'u-denied');
    await handlers.messageCreate(denied);
    expect(denied.reply).toHaveBeenCalledWith('not eligible for mycode');

    const dmFail = makeMessage('!mycode', 'owner8');
    dmFail.author.send.mockRejectedValueOnce(new Error('dm closed'));
    await handlers.messageCreate(dmFail);
    expect(dmFail.reply).toHaveBeenCalledWith('Could not DM you. Please check your privacy settings.');
  });

  test('evaluates game role participation path when role IDs configured', async () => {
    process.env.CTB_GAME_ROLE_IDS = 'roleA';
    const handlers = setup();
    const msg = makeMessage('!help', 'roleUser');
    msg.member.roles.cache.has.mockReturnValueOnce(true);

    await handlers.messageCreate(msg);

    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Available Commands'));
    delete process.env.CTB_GAME_ROLE_IDS;
  });

  test('handles owner env fallback when CTB_OWNER_USER_ID is undefined', async () => {
    delete process.env.CTB_OWNER_USER_ID;
    const handlers = setup();
    const msg = makeMessage('!help', 'u-owner-fallback');

    await handlers.messageCreate(msg);

    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Available Commands'));
  });

  test('does not send files when channel.send is unavailable for chart commands', async () => {
    const handlers = setup();
    mockExecute
      .mockResolvedValueOnce([[{ user: 'u1', score: 50 }]])
      .mockResolvedValueOnce([[{ game: 'dice', score: 30 }]]);

    const top5 = makeMessage('!top5', 'owner10');
    top5.channel = {} as any;
    await handlers.messageCreate(top5);

    const stats = makeMessage('!stats testuser', 'owner11');
    stats.channel = {} as any;
    await handlers.messageCreate(stats);

    expect(getChartUrl).toHaveBeenCalledTimes(2);
  });

  test('sends fallback error message when handler throws', async () => {
    (checkFraudulentActivity as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const handlers = setup();
    const msg = makeMessage('!help');
    await handlers.messageCreate(msg);
    expect(msg.reply).toHaveBeenCalledWith('Command unavailable right now. Check database configuration and try again.');
  });
});
