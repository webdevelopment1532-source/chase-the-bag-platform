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

describe('advanced ad drops interval execution', () => {
  test('interval callback iterates guild channels and sends ad message', async () => {
    process.env.CTB_ADMIN_USER_IDS = 'admin1';
    const timers = require('timers');

    let capturedCallback: any = null;
    const setIntervalSpy = jest
      .spyOn(timers, 'setInterval')
      .mockImplementation(((fn: () => Promise<void>) => {
        capturedCallback = fn;
        return 1 as any;
      }) as any);

    const { startAutomatedAdDrops, stopAutomatedAdDrops } = require('../src/advanced-commands');

    const send = jest.fn().mockResolvedValue(undefined);
    const channel = { name: 'stake-ads', isTextBased: true, send };
    const guild = {
      channels: {
        cache: {
          find: jest.fn((predicate: any) => (predicate(channel) ? channel : undefined)),
        },
      },
    };
    const client = { guilds: { cache: new Map([['g1', guild]]) } } as any;

    startAutomatedAdDrops(client);
    expect(capturedCallback).not.toBeNull();

    if (typeof capturedCallback === 'function') {
      await capturedCallback();
    } else {
      throw new Error('Interval callback was not captured');
    }

    expect(send).toHaveBeenCalledTimes(1);

    stopAutomatedAdDrops();
    setIntervalSpy.mockRestore();
  });

  test('interval callback skips guilds without a send-capable ad channel', async () => {
    process.env.CTB_ADMIN_USER_IDS = 'admin1';
    const timers = require('timers');

    let capturedCallback: any = null;
    const setIntervalSpy = jest
      .spyOn(timers, 'setInterval')
      .mockImplementation(((fn: () => Promise<void>) => {
        capturedCallback = fn;
        return 1 as any;
      }) as any);

    const { startAutomatedAdDrops, stopAutomatedAdDrops } = require('../src/advanced-commands');

    const nonTextChannel = { name: 'stake-ads', isTextBased: false };
    const guild = {
      channels: {
        cache: {
          find: jest.fn((predicate: any) => (predicate(nonTextChannel) ? nonTextChannel : undefined)),
        },
      },
    };
    const client = { guilds: { cache: new Map([['g1', guild]]) } } as any;

    startAutomatedAdDrops(client);
    expect(capturedCallback).not.toBeNull();

    if (typeof capturedCallback === 'function') {
      await capturedCallback();
    }

    expect(guild.channels.cache.find).toHaveBeenCalled();

    stopAutomatedAdDrops();
    setIntervalSpy.mockRestore();
  });
});
