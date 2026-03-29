// personalize.ts → advanced-commands.ts → scraper.ts → node-fetch/db
// Mock the heavy dependencies so Jest doesn't trip on ESM modules
jest.mock('../src/db');
jest.mock('../src/audit-log');
jest.mock('../src/scraper');
jest.mock('../src/virtual-board');
jest.mock('../src/referral');
jest.mock('../src/antifraud');
jest.mock('../src/export-data');
jest.mock('../src/analytics');
jest.mock('../src/chart');

import { getDbConnection } from '../src/db';

const mockExecute = jest.fn().mockResolvedValue([[]]);
const mockConn = { execute: mockExecute, end: jest.fn().mockResolvedValue(undefined) };
(getDbConnection as jest.MockedFunction<typeof getDbConnection>).mockResolvedValue(mockConn as any);

describe('getPersonalizedOffer', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('returns VIP offer for users with > 1000 points', () => {
    const { getUserReward, addUserPoints } = require('../src/advanced-commands');
    const { getPersonalizedOffer } = require('../src/personalize');

    addUserPoints('vipUser', 1001);
    const offer = getPersonalizedOffer('vipUser');
    expect(offer).toContain('VIP');
    expect(offer).toContain('cashback');
  });

  test('returns Gold offer for users with > 500 points', () => {
    const { addUserPoints } = require('../src/advanced-commands');
    const { getPersonalizedOffer } = require('../src/personalize');

    addUserPoints('goldUser', 501);
    const offer = getPersonalizedOffer('goldUser');
    expect(offer).toContain('Gold');
  });

  test('returns Silver offer for users with > 200 points', () => {
    const { addUserPoints } = require('../src/advanced-commands');
    const { getPersonalizedOffer } = require('../src/personalize');

    addUserPoints('silverUser', 201);
    const offer = getPersonalizedOffer('silverUser');
    expect(offer).toContain('Silver');
  });

  test('returns Bronze/default offer for new users', () => {
    const { getPersonalizedOffer } = require('../src/personalize');
    const offer = getPersonalizedOffer('freshUser');
    expect(offer).toContain('Play more');
  });
});
