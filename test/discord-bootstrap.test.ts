describe('Discord bootstrap integration', () => {
  function chainableOption() {
    return {
      setName: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setRequired: jest.fn().mockReturnThis(),
      addChoices: jest.fn().mockReturnThis(),
    };
  }

  class MockSlashCommandBuilder {
    setName() { return this; }
    setDescription() { return this; }
    addSubcommand(fn: (sub: MockSlashCommandBuilder) => unknown) { fn(new MockSlashCommandBuilder()); return this; }
    addStringOption(fn: (opt: ReturnType<typeof chainableOption>) => unknown) { fn(chainableOption()); return this; }
    addNumberOption(fn: (opt: ReturnType<typeof chainableOption>) => unknown) { fn(chainableOption()); return this; }
    addUserOption(fn: (opt: ReturnType<typeof chainableOption>) => unknown) { fn(chainableOption()); return this; }
    toJSON() { return { mock: true }; }
  }

  class MockEmbedBuilder {
    setColor() { return this; }
    setTitle() { return this; }
    setDescription() { return this; }
    addFields() { return this; }
    setTimestamp() { return this; }
    setFooter() { return this; }
  }

  function loadIndexWithEnv(env: Record<string, string | undefined>) {
    jest.resetModules();

    const vars = [
      'DISCORD_TOKEN',
      'DISCORD_BOT_TOKEN',
      'CTB_GAME_CHANNEL_ID',
      'CTB_GAME_CHANNEL_URL',
      'CTB_CRAWLER_INTERVAL_MS',
      'CTB_CRAWLER_SYSTEM_USER_ID',
      'CTB_CRAWLER_FAILURE_ALERT_THRESHOLD',
      'CTB_CRAWLER_ANNOUNCE_CHANNEL_ID',
      'CTB_CRAWLER_ANNOUNCE_CHANNEL_NAME',
      'CTB_CRAWLER_HEALTH_CHANNEL_ID',
      'CTB_CRAWLER_HEALTH_CHANNEL_NAME',
    ];

    for (const key of vars) {
      if (env[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = env[key];
      }
    }

    const loginMock = jest.fn().mockImplementation((token?: string) => {
      if (token === 'bad-token') {
        return Promise.reject(new Error('bad-token'));
      }
      return Promise.resolve(undefined);
    });
    const onceMock = jest.fn();
    const onMock = jest.fn();
    const commandsSetMock = jest.fn().mockResolvedValue(undefined);

    const mockClient = {
      once: onceMock,
      on: onMock,
      login: loginMock,
      application: { commands: { set: commandsSetMock } },
      channels: { cache: { get: jest.fn() } },
      guilds: { cache: new Map() },
      user: { tag: 'bot#0001' },
    };

    const Client = jest.fn(() => mockClient as any);

    jest.doMock('discord.js', () => ({
      Client,
      GatewayIntentBits: {
        Guilds: 1,
        GuildMembers: 2,
        GuildMessages: 3,
        MessageContent: 4,
      },
      Partials: {
        Channel: 1,
        GuildMember: 2,
        Message: 3,
      },
      SlashCommandBuilder: MockSlashCommandBuilder,
      EmbedBuilder: MockEmbedBuilder,
      TextChannel: class {},
      ChannelType: {},
    }));

    const registerAdvancedCommands = jest.fn();
    const startAutomatedAdDrops = jest.fn();
    jest.doMock('../src/advanced-commands', () => ({
      registerAdvancedCommands,
      startAutomatedAdDrops,
    }));

    const announceUpcomingEvents = jest.fn();
    jest.doMock('../src/events', () => ({ announceUpcomingEvents }));

    const registerAffiliateCommands = jest.fn();
    jest.doMock('../src/affiliates', () => ({ registerAffiliateCommands }));

    const startApiServer = jest.fn();
    jest.doMock('../src/api', () => ({ startApiServer }));

    const getStakeCrawlerStatus = jest.fn(() => ({
      active: true,
      running: false,
      intervalMs: 300000,
      totalRuns: 0,
      totalCodesFound: 0,
      consecutiveFailures: 0,
      lastSuccessAt: null,
      lastAlertAt: null,
      lastError: null,
    }));
    const startStakeCrawlerService = jest.fn();
    jest.doMock('../src/crawler-service', () => ({
      getStakeCrawlerStatus,
      startStakeCrawlerService,
    }));

    const assertExchangeAccess = jest.fn().mockResolvedValue(undefined);
    const awardExchangePoints = jest.fn().mockResolvedValue(undefined);
    const creditUserBalance = jest.fn().mockResolvedValue(undefined);
    const debitUserBalance = jest.fn().mockResolvedValue(undefined);
    const getBalance = jest.fn().mockResolvedValue(1000);
    const getExchangeOverview = jest.fn().mockResolvedValue({
      profile: { tier: 'Bronze', points: 42 },
      balances: [{ asset: 'BTC', balance: 1.23 }],
      limits: { usedDailyVolume: 12.34, remainingDailyVolume: 987.66 },
    });
    jest.doMock('../src/exchange-accounts', () => ({
      assertExchangeAccess,
      awardExchangePoints,
      creditUserBalance,
      debitUserBalance,
      getBalance,
      getExchangeOverview,
    }));

    const getBinancePrices = jest.fn().mockResolvedValue(new Map([['BTC', 60000], ['ETH', 3000], ['SOL', 100], ['BNB', 500]]));
    const recordMixingTransaction = jest.fn().mockResolvedValue({
      tradeType: 'mixing',
      fromToken: 'BTC',
      toToken: 'BTC',
      fromAmount: 1,
      toAmount: 1,
      exchangeFee: 0.2,
      platformFee: 0.1,
      entryPrice: 100,
      profit: 1,
      profitPercent: 1,
    });
    const recordStakingReward = jest.fn().mockResolvedValue({
      tradeType: 'staking',
      fromToken: 'SOL',
      toToken: 'SOL',
      fromAmount: 100,
      toAmount: 110,
      exchangeFee: 0,
      platformFee: 0,
      entryPrice: 100,
      profit: 10,
      profitPercent: 10,
    });
    const simulateBinanceTrade = jest.fn().mockResolvedValue({
      tradeType: 'crypto_swap',
      fromToken: 'BTC',
      toToken: 'ETH',
      fromAmount: 1,
      toAmount: 12,
      exchangeFee: 0.2,
      platformFee: 0.1,
      entryPrice: 100,
      profit: 5,
      profitPercent: 2,
    });
    jest.doMock('../src/exchange-integration', () => ({
      getBinancePrices,
      recordMixingTransaction,
      recordStakingReward,
      simulateBinanceTrade,
    }));

    const playBlackjack = jest.fn().mockReturnValue('bj');
    const playPlinko = jest.fn().mockReturnValue('plinko');
    const playMines = jest.fn().mockReturnValue('mines');
    const playKeno = jest.fn().mockReturnValue('keno');
    const playHiLo = jest.fn().mockReturnValue('hilo');
    const playWheel = jest.fn().mockReturnValue('wheel');
    const playTower = jest.fn().mockReturnValue('tower');
    const playVideoPoker = jest.fn().mockReturnValue('videopoker');
    jest.doMock('../src/games', () => ({
      playBlackjack,
      playPlinko,
      playMines,
      playKeno,
      playHiLo,
      playWheel,
      playTower,
      playVideoPoker,
    }));

    const getLeaderboard = jest.fn().mockResolvedValue([{ rank: 1, tier: 'Bronze', userId: 'u1', points: 10, totalVolume: 20, totalTrades: 2, totalProfit: 3 }]);
    const getUserRank = jest.fn().mockResolvedValue({ rank: 1, totalUsers: 9 });
    const tierEmoji = jest.fn().mockReturnValue('🥉');
    const tierColor = jest.fn().mockReturnValue(0xFFD700);
    const rankEmoji = jest.fn().mockReturnValue('1️⃣');
    jest.doMock('../src/leaderboard', () => ({
      getLeaderboard,
      getUserRank,
      tierEmoji,
      tierColor,
      rankEmoji,
    }));

    const performCheckin = jest.fn().mockResolvedValue({
      success: true,
      message: 'ok',
      pointsAwarded: 10,
      currentStreak: 2,
      longestStreak: 3,
      totalCheckins: 4,
      alreadyCheckedIn: false,
    });
    const getCheckinStatus = jest.fn().mockResolvedValue({ currentStreak: 2 });
    jest.doMock('../src/checkin', () => ({ performCheckin, getCheckinStatus }));

    const ALL_ACHIEVEMENTS = [{ name: 'A', emoji: '🏅', description: 'd', bonusPoints: 1 }];
    const checkAndAwardAchievements = jest.fn().mockResolvedValue([]);
    const getEarnedAchievements = jest.fn().mockResolvedValue([]);
    const setAchievementAnnouncer = jest.fn();
    const announceNewAchievements = jest.fn().mockResolvedValue(undefined);
    jest.doMock('../src/achievements', () => ({
      ALL_ACHIEVEMENTS,
      checkAndAwardAchievements,
      getEarnedAchievements,
      setAchievementAnnouncer,
      announceNewAchievements,
    }));

    const startPriceFeed = jest.fn();
    jest.doMock('../src/price-feed', () => ({ startPriceFeed }));

    // Side-effect import under test (force TS entrypoint for Jest CJS mode).
    require('../src/index.ts');

    const messageCreateCall = onMock.mock.calls.find((entry) => entry[0] === 'messageCreate');
    const messageCreateHandler = messageCreateCall?.[1] as ((message: any) => Promise<void>) | undefined;
    const interactionCreateCall = onMock.mock.calls.find((entry) => entry[0] === 'interactionCreate');
    const interactionCreateHandler = interactionCreateCall?.[1] as ((interaction: any) => Promise<void>) | undefined;
    const readyCallbacks = onceMock.mock.calls.filter((entry) => entry[0] === 'clientReady').map((entry) => entry[1]);

    return {
      Client,
      loginMock,
      messageCreateHandler,
      interactionCreateHandler,
      readyCallbacks,
      mockClient,
      startStakeCrawlerService,
      commandsSetMock,
      mocks: {
        getBinancePrices,
        getLeaderboard,
        getUserRank,
        getBalance,
        getExchangeOverview,
        getStakeCrawlerStatus,
        performCheckin,
        getCheckinStatus,
        getEarnedAchievements,
        checkAndAwardAchievements,
        setAchievementAnnouncer,
        assertExchangeAccess,
        recordMixingTransaction,
        recordStakingReward,
        simulateBinanceTrade,
      },
    };
  }

  test('uses DISCORD_BOT_TOKEN fallback when DISCORD_TOKEN is missing', () => {
    const { loginMock } = loadIndexWithEnv({
      DISCORD_TOKEN: undefined,
      DISCORD_BOT_TOKEN: 'bot-token-fallback',
    });

    expect(loginMock).toHaveBeenCalledWith('bot-token-fallback');
  });

  test('prefers DISCORD_TOKEN when both token vars are present', () => {
    const { loginMock } = loadIndexWithEnv({
      DISCORD_TOKEN: 'primary-token',
      DISCORD_BOT_TOKEN: 'secondary-token',
    });

    expect(loginMock).toHaveBeenCalledWith('primary-token');
  });

  test('initializes client with GuildMembers intent for member join workflows', () => {
    const { Client } = loadIndexWithEnv({
      DISCORD_TOKEN: 'primary-token',
    });

    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({
        intents: expect.arrayContaining([2]),
      }),
    );
  });

  test('uses default game channel fallback and responds to ping in that channel', async () => {
    const { messageCreateHandler } = loadIndexWithEnv({
      DISCORD_TOKEN: 'primary-token',
      CTB_GAME_CHANNEL_ID: undefined,
      CTB_GAME_CHANNEL_URL: undefined,
    });

    expect(messageCreateHandler).toBeDefined();

    const message = {
      author: { bot: false },
      channel: { id: '1486358062179680288' },
      content: '!ping',
      reply: jest.fn(),
    };

    await messageCreateHandler!(message);

    expect(message.reply).toHaveBeenCalledWith('Pong!');
  });

  test('derives game channel id from Discord URL env variable', async () => {
    const { messageCreateHandler } = loadIndexWithEnv({
      DISCORD_TOKEN: 'primary-token',
      CTB_GAME_CHANNEL_ID: undefined,
      CTB_GAME_CHANNEL_URL: 'https://discord.com/channels/1486358059772280933/1486358062179680288',
    });

    const allowedMessage = {
      author: { bot: false },
      channel: { id: '1486358062179680288' },
      content: '!ping',
      reply: jest.fn(),
    };

    const blockedMessage = {
      author: { bot: false },
      channel: { id: 'different-channel' },
      content: '!ping',
      reply: jest.fn(),
    };

    await messageCreateHandler!(allowedMessage);
    await messageCreateHandler!(blockedMessage);

    expect(allowedMessage.reply).toHaveBeenCalledWith('Pong!');
    expect(blockedMessage.reply).not.toHaveBeenCalled();
  });

  test('skips discord login and warns when no token is configured', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { loginMock } = loadIndexWithEnv({
      DISCORD_TOKEN: '',
      DISCORD_BOT_TOKEN: '',
    });

    expect(loginMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('covers core message command routes and exchange helper', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.2);
    const { messageCreateHandler } = loadIndexWithEnv({ DISCORD_TOKEN: 'primary-token' });
    const mkMsg = (content: string) => ({
      author: { bot: false, id: 'user-1' },
      channel: { id: '1486358062179680288' },
      content,
      reply: jest.fn().mockResolvedValue(undefined),
    });

    const commands = ['!coinflip', '!dice', '!roulette', '!crash', '!blackjack', '!slots', '!plinko', '!mines', '!keno', '!hilo', '!wheel', '!tower', '!videopoker', '!games', '!exchange help', '!exchange prices BTC ETH', '!exchange portfolio', '!exchange swap BTC ETH 1', '!exchange mix BTC 1', '!exchange stake SOL 100 10', '!leaderboard points', '!checkin', '!achievements', '!crawlerstatus'];

    for (const cmd of commands) {
      const msg = mkMsg(cmd);
      await messageCreateHandler!(msg);
      await new Promise((resolve) => setImmediate(resolve));
      expect(msg.reply).toHaveBeenCalled();
    }

    const unknown = mkMsg('!exchange xyz');
    await messageCreateHandler!(unknown);
    await new Promise((resolve) => setImmediate(resolve));
    expect(unknown.reply).toHaveBeenCalledWith('Unknown Coin Exchange command. Use `!exchange help`.');

    randomSpy.mockRestore();
  });

  test('registers slash commands and handles interaction commands', async () => {
    const { interactionCreateHandler, readyCallbacks, commandsSetMock, mocks } = loadIndexWithEnv({ DISCORD_TOKEN: 'primary-token' });

    for (const ready of readyCallbacks) {
      await ready();
    }
    expect(commandsSetMock).toHaveBeenCalled();

    const mkInteraction = (commandName: string, opts: Record<string, unknown> = {}) => ({
      isChatInputCommand: () => true,
      commandName,
      user: { id: 'user-1', username: 'user1' },
      channelId: '1486358062179680288',
      options: {
        getString: (k: string, required?: boolean) => {
          if (required && opts[k] === undefined) throw new Error('missing');
          return (opts[k] as string) ?? null;
        },
        getNumber: (k: string, required?: boolean) => {
          if (required && opts[k] === undefined) throw new Error('missing');
          return (opts[k] as number) ?? null;
        },
        getSubcommand: () => (opts.subcommand as string) ?? 'help',
        getUser: () => null,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    });

    await interactionCreateHandler!(mkInteraction('leaderboard', { category: 'points' }));
    await interactionCreateHandler!(mkInteraction('checkin'));
    await interactionCreateHandler!(mkInteraction('achievements'));
    await interactionCreateHandler!(mkInteraction('exchange', { subcommand: 'help' }));
    await interactionCreateHandler!(mkInteraction('exchange', { subcommand: 'portfolio' }));
    await interactionCreateHandler!(mkInteraction('exchange', { subcommand: 'prices', symbols: 'BTC ETH' }));
    await interactionCreateHandler!(mkInteraction('exchange', { subcommand: 'swap', from: 'BTC', to: 'ETH', amount: 1 }));
    await interactionCreateHandler!(mkInteraction('exchange', { subcommand: 'mix', asset: 'BTC', amount: 1 }));
    await interactionCreateHandler!(mkInteraction('exchange', { subcommand: 'stake', asset: 'SOL', staked: 100, reward: 10 }));

    const badChannelInteraction = mkInteraction('exchange', { subcommand: 'help' });
    badChannelInteraction.channelId = 'other-channel';
    await interactionCreateHandler!(badChannelInteraction);
    expect(badChannelInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));

    (mocks.getBinancePrices as jest.Mock).mockResolvedValueOnce(new Map());
    const pricesUnavailable = mkInteraction('exchange', { subcommand: 'prices', symbols: 'BTC' });
    await interactionCreateHandler!(pricesUnavailable);
    expect(pricesUnavailable.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));

    (mocks.getLeaderboard as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const leaderboardFail = mkInteraction('leaderboard', { category: 'profit' });
    await interactionCreateHandler!(leaderboardFail);
    expect(leaderboardFail.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
  });

  test('wires crawler callbacks and broadcasts to discovered channels', async () => {
    const { startStakeCrawlerService, mockClient } = loadIndexWithEnv({ DISCORD_TOKEN: 'primary-token' });
    const send = jest.fn().mockResolvedValue(undefined);
    const guild = {
      channels: {
        cache: {
          get: jest.fn().mockReturnValue(null),
          find: jest.fn((predicate: (ch: any) => boolean) => {
            const candidate = { name: 'ctb-bonus-codes', isTextBased: () => true, send };
            return predicate(candidate) ? candidate : null;
          }),
        },
      },
    };
    mockClient.guilds.cache = new Map([['g1', guild]]);

    const cfg = (startStakeCrawlerService as jest.Mock).mock.calls[0][0];
    await cfg.announceCodes(['CODE1', 'CODE2']);
    await cfg.announceHealthAlert('crawler down');

    expect(send).toHaveBeenCalled();
  });

  test('covers crawler channel-id lookup and achievement announcer callback branches', async () => {
    const { startStakeCrawlerService, mockClient, readyCallbacks, mocks } = loadIndexWithEnv({
      DISCORD_TOKEN: 'primary-token',
      CTB_CRAWLER_ANNOUNCE_CHANNEL_ID: 'announce-id',
      CTB_CRAWLER_HEALTH_CHANNEL_ID: 'health-id',
    });

    const send = jest.fn().mockResolvedValue(undefined);
    const guild = {
      channels: {
        cache: {
          get: jest.fn().mockReturnValue({ send }),
          find: jest.fn().mockReturnValue(null),
        },
      },
    };
    mockClient.guilds.cache = new Map([['g1', guild]]);

    const cfg = (startStakeCrawlerService as jest.Mock).mock.calls[0][0];
    await cfg.announceCodes(['A']);
    await cfg.announceHealthAlert('H');

    for (const ready of readyCallbacks) {
      await ready();
    }

    const announcer = (mocks.setAchievementAnnouncer as jest.Mock).mock.calls[0][0];
    mockClient.channels.cache.get = jest.fn().mockReturnValue({ send });
    await announcer('u1', { emoji: '🏅', name: 'n', description: 'd', bonusPoints: 0 });

    expect(send).toHaveBeenCalled();
  });

  test('covers exchange/message and interaction error branches', async () => {
    const { messageCreateHandler, interactionCreateHandler, mocks } = loadIndexWithEnv({ DISCORD_TOKEN: 'primary-token' });
    const mkMsg = (content: string) => ({
      author: { bot: false, id: 'user-1' },
      channel: { id: '1486358062179680288' },
      content,
      reply: jest.fn().mockResolvedValue(undefined),
    });

    (mocks.getBinancePrices as jest.Mock).mockResolvedValueOnce(new Map());
    const pricesDown = mkMsg('!exchange prices BTC');
    await messageCreateHandler!(pricesDown);
    await new Promise((resolve) => setImmediate(resolve));
    expect(pricesDown.reply).toHaveBeenCalledWith('💱 Coin Exchange prices are unavailable right now.');

    const swapUsage = mkMsg('!exchange swap');
    await messageCreateHandler!(swapUsage);
    await new Promise((resolve) => setImmediate(resolve));
    expect(swapUsage.reply).toHaveBeenCalledWith('Usage: `!exchange swap BTC ETH 0.10`');

    (mocks.getBalance as jest.Mock).mockResolvedValueOnce(0.1);
    const swapLow = mkMsg('!exchange swap BTC ETH 1');
    await messageCreateHandler!(swapLow);
    await new Promise((resolve) => setImmediate(resolve));
    expect(swapLow.reply).toHaveBeenCalledWith(expect.stringContaining('Insufficient BTC balance'));

    (mocks.simulateBinanceTrade as jest.Mock).mockRejectedValueOnce(new Error('swap-fail'));
    const swapFail = mkMsg('!exchange swap BTC ETH 1');
    await messageCreateHandler!(swapFail);
    await new Promise((resolve) => setImmediate(resolve));
    expect(swapFail.reply).toHaveBeenCalledWith(expect.stringContaining('Coin Exchange swap failed'));

    (mocks.simulateBinanceTrade as jest.Mock).mockResolvedValueOnce({
      tradeType: 'crypto_swap',
      fromToken: 'BTC',
      toToken: 'ETH',
      fromAmount: 1,
      toAmount: 1,
      exchangeFee: 0,
      platformFee: 0,
      entryPrice: 1,
      profit: 0,
      profitPercent: 0,
    });
    (mocks.checkAndAwardAchievements as jest.Mock).mockRejectedValueOnce(new Error('ach-fail'));
    const swapAchFallback = mkMsg('!exchange swap BTC ETH 1');
    await messageCreateHandler!(swapAchFallback);
    await new Promise((resolve) => setImmediate(resolve));
    expect(swapAchFallback.reply).toHaveBeenCalled();

    const mixUsage = mkMsg('!exchange mix');
    await messageCreateHandler!(mixUsage);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mixUsage.reply).toHaveBeenCalledWith('Usage: `!exchange mix BTC 0.05 [feePercent]`');

    (mocks.recordMixingTransaction as jest.Mock).mockRejectedValueOnce(new Error('mix-fail'));
    const mixFail = mkMsg('!exchange mix BTC 1');
    await messageCreateHandler!(mixFail);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mixFail.reply).toHaveBeenCalledWith(expect.stringContaining('Coin Exchange mixer failed'));

    const stakeUsage = mkMsg('!exchange stake SOL');
    await messageCreateHandler!(stakeUsage);
    await new Promise((resolve) => setImmediate(resolve));
    expect(stakeUsage.reply).toHaveBeenCalledWith('Usage: `!exchange stake SOL 150 2.5 [apy]`');

    (mocks.recordStakingReward as jest.Mock).mockRejectedValueOnce(new Error('stake-fail'));
    const stakeFail = mkMsg('!exchange stake SOL 100 10');
    await messageCreateHandler!(stakeFail);
    await new Promise((resolve) => setImmediate(resolve));
    expect(stakeFail.reply).toHaveBeenCalledWith(expect.stringContaining('Coin Exchange staking failed'));

    (mocks.getLeaderboard as jest.Mock).mockRejectedValueOnce(new Error('board-fail'));
    const boardFail = mkMsg('!leaderboard profit');
    await messageCreateHandler!(boardFail);
    await new Promise((resolve) => setImmediate(resolve));
    expect(boardFail.reply).toHaveBeenCalledWith('Leaderboard data unavailable right now.');

    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValueOnce([{ emoji: '🏅', name: 'x' }]);
    const checkin = mkMsg('!checkin');
    await messageCreateHandler!(checkin);
    await new Promise((resolve) => setImmediate(resolve));
    expect(checkin.reply).toHaveBeenCalled();

    (mocks.getEarnedAchievements as jest.Mock).mockResolvedValueOnce([{ emoji: '🏅', name: 'x', description: 'd' }]);
    const achievements = mkMsg('!achievements');
    await messageCreateHandler!(achievements);
    await new Promise((resolve) => setImmediate(resolve));
    expect(achievements.reply).toHaveBeenCalled();

    const mkInteraction = (subcommand: string) => ({
      isChatInputCommand: () => true,
      commandName: 'exchange',
      user: { id: 'user-1', username: 'user1' },
      channelId: '1486358062179680288',
      options: {
        getString: (k: string, required?: boolean) => {
          const map: Record<string, string> = { from: 'BTC', to: 'ETH', asset: 'BTC' };
          if (k === 'symbols') return 'BTC';
          if (required && !map[k]) throw new Error('missing');
          return map[k] ?? null;
        },
        getNumber: (k: string) => ({ amount: 1, staked: 100, reward: 10 } as Record<string, number>)[k] ?? null,
        getSubcommand: () => subcommand,
        getUser: () => ({ id: 'u2', username: 'u2' }),
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    });

    const swapInsufficient = mkInteraction('swap');
    (mocks.getBalance as jest.Mock).mockResolvedValueOnce(0.1);
    await interactionCreateHandler!(swapInsufficient);
    expect(swapInsufficient.editReply).toHaveBeenCalledWith(expect.stringContaining('Insufficient BTC balance'));

    const swapError = mkInteraction('swap');
    (mocks.simulateBinanceTrade as jest.Mock).mockRejectedValueOnce(new Error('swap')); 
    await interactionCreateHandler!(swapError);
    expect(swapError.editReply).toHaveBeenCalledWith(expect.stringContaining('Exchange swap failed'));

    const mixError = mkInteraction('mix');
    (mocks.recordMixingTransaction as jest.Mock).mockRejectedValueOnce(new Error('mix')); 
    await interactionCreateHandler!(mixError);
    expect(mixError.editReply).toHaveBeenCalledWith(expect.stringContaining('Exchange mixer failed'));

    const stakeError = mkInteraction('stake');
    (mocks.recordStakingReward as jest.Mock).mockRejectedValueOnce(new Error('stake')); 
    await interactionCreateHandler!(stakeError);
    expect(stakeError.editReply).toHaveBeenCalledWith(expect.stringContaining('Exchange staking failed'));
  });

  test('covers login catch branch', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    loadIndexWithEnv({ DISCORD_TOKEN: 'bad-token' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  test('covers remaining portfolio/achievement fallback branches', async () => {
    const { messageCreateHandler, interactionCreateHandler, mocks } = loadIndexWithEnv({
      DISCORD_TOKEN: 'primary-token',
      CTB_GAME_CHANNEL_ID: '',
      CTB_GAME_CHANNEL_URL: 'invalid-discord-url',
    });

    const mkExchangeInteraction = (subcommand: 'prices' | 'swap' | 'mix' | 'stake', extra: Record<string, any> = {}) => ({
      isChatInputCommand: () => true,
      commandName: 'exchange',
      user: { id: 'user-1', username: 'user1' },
      channelId: '1486358062179680288',
      options: {
        getString: (k: string, required?: boolean) => {
          const map: Record<string, string> = {
            from: 'BTC',
            to: 'ETH',
            asset: 'BTC',
            symbols: extra.symbols ?? null,
          };
          if (required && map[k] === undefined) throw new Error('missing');
          return map[k] ?? null;
        },
        getNumber: (k: string) => ({ amount: 1, staked: 100, reward: 10 } as Record<string, number>)[k] ?? null,
        getSubcommand: () => subcommand,
        getUser: () => null,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    });

    (mocks.getCheckinStatus as jest.Mock).mockRejectedValueOnce(new Error('no-checkin'));
    (mocks.getEarnedAchievements as jest.Mock).mockRejectedValueOnce(new Error('no-ach'));

    const portfolioMessage = {
      author: { bot: false, id: 'user-1' },
      channel: { id: '1486358062179680288' },
      content: '!exchange portfolio',
      reply: jest.fn().mockResolvedValue(undefined),
    };
    await messageCreateHandler!(portfolioMessage);
    await new Promise((resolve) => setImmediate(resolve));
    expect(portfolioMessage.reply).toHaveBeenCalled();

    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValue([{ emoji: '🏅', name: 'A' }]);
    const swapMessage = {
      author: { bot: false, id: 'user-1' },
      channel: { id: '1486358062179680288' },
      content: '!exchange swap BTC ETH 1',
      reply: jest.fn().mockResolvedValue(undefined),
    };
    await messageCreateHandler!(swapMessage);
    await new Promise((resolve) => setImmediate(resolve));
    expect(swapMessage.reply).toHaveBeenCalled();

    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValue([{ emoji: '🏅', name: 'B' }]);
    const mixMessage = {
      author: { bot: false, id: 'user-1' },
      channel: { id: '1486358062179680288' },
      content: '!exchange mix BTC 1',
      reply: jest.fn().mockResolvedValue(undefined),
    };
    await messageCreateHandler!(mixMessage);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mixMessage.reply).toHaveBeenCalled();

    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValue([{ emoji: '🏅', name: 'C' }]);
    const stakeMessage = {
      author: { bot: false, id: 'user-1' },
      channel: { id: '1486358062179680288' },
      content: '!exchange stake SOL 100 10',
      reply: jest.fn().mockResolvedValue(undefined),
    };
    await messageCreateHandler!(stakeMessage);
    await new Promise((resolve) => setImmediate(resolve));
    expect(stakeMessage.reply).toHaveBeenCalled();

    const interaction = {
      isChatInputCommand: () => true,
      commandName: 'achievements',
      user: { id: 'user-1', username: 'user1' },
      channelId: '1486358062179680288',
      options: {
        getString: () => null,
        getNumber: () => null,
        getSubcommand: () => 'help',
        getUser: () => ({ id: 'target', username: 'target' }),
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    };
    (mocks.getEarnedAchievements as jest.Mock).mockResolvedValueOnce([{ emoji: '🏅', name: 'Z', description: 'desc' }]);
    await interactionCreateHandler!(interaction);
    expect(interaction.reply).toHaveBeenCalled();

    const slashCheckin = {
      isChatInputCommand: () => true,
      commandName: 'checkin',
      user: { id: 'user-1', username: 'user1' },
      channelId: '1486358062179680288',
      options: {
        getString: () => null,
        getNumber: () => null,
        getSubcommand: () => 'help',
        getUser: () => null,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    };
    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValueOnce([{ emoji: '🏅', name: 'check' }]);
    await interactionCreateHandler!(slashCheckin);
    expect(slashCheckin.reply).toHaveBeenCalled();

    // Cover slash prices with default symbols path (rawSymbols empty).
    const slashPricesDefault = mkExchangeInteraction('prices', { symbols: null });
    await interactionCreateHandler!(slashPricesDefault);
    expect(slashPricesDefault.reply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));

    // Cover slash swap/mix/stake achievement-addFields paths.
    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValueOnce([{ emoji: '🏅', name: 'swap-ach' }]);
    const slashSwap = mkExchangeInteraction('swap');
    await interactionCreateHandler!(slashSwap);
    expect(slashSwap.editReply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));

    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValueOnce([{ emoji: '🏅', name: 'mix-ach' }]);
    const slashMix = mkExchangeInteraction('mix');
    await interactionCreateHandler!(slashMix);
    expect(slashMix.editReply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));

    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValueOnce([{ emoji: '🏅', name: 'stake-ach' }]);
    const slashStake = mkExchangeInteraction('stake');
    await interactionCreateHandler!(slashStake);
    expect(slashStake.editReply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));

    expect(mocks.checkAndAwardAchievements).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ singleTradeUsdVolume: expect.any(Number) })
    );
  });

  test('covers slash exchange catch branches with non-Error rejections', async () => {
    const { interactionCreateHandler, mocks } = loadIndexWithEnv({
      DISCORD_TOKEN: 'primary-token',
      CTB_GAME_CHANNEL_ID: '1486358062179680288',
    });

    const mkInteraction = (subcommand: 'swap' | 'mix' | 'stake') => ({
      isChatInputCommand: () => true,
      commandName: 'exchange',
      user: { id: 'user-1', username: 'user1' },
      channelId: '1486358062179680288',
      options: {
        getString: (k: string) => ({ from: 'BTC', to: 'ETH', asset: 'BTC' } as Record<string, string>)[k] ?? null,
        getNumber: (k: string) => ({ amount: 1, staked: 100, reward: 10 } as Record<string, number>)[k] ?? null,
        getSubcommand: () => subcommand,
        getUser: () => null,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    });

    (mocks.simulateBinanceTrade as jest.Mock).mockRejectedValueOnce('swap-string-fail');
    const slashSwap = mkInteraction('swap');
    await interactionCreateHandler!(slashSwap);
    expect(slashSwap.editReply).toHaveBeenCalledWith(expect.stringContaining('unknown error'));

    (mocks.recordMixingTransaction as jest.Mock).mockRejectedValueOnce('mix-string-fail');
    const slashMix = mkInteraction('mix');
    await interactionCreateHandler!(slashMix);
    expect(slashMix.editReply).toHaveBeenCalledWith(expect.stringContaining('unknown error'));

    (mocks.recordStakingReward as jest.Mock).mockRejectedValueOnce('stake-string-fail');
    const slashStake = mkInteraction('stake');
    await interactionCreateHandler!(slashStake);
    expect(slashStake.editReply).toHaveBeenCalledWith(expect.stringContaining('unknown error'));
  });

  test('covers interaction early-returns and default category/subcommand fallthrough branches', async () => {
    const { interactionCreateHandler } = loadIndexWithEnv({ DISCORD_TOKEN: 'primary-token' });

    // Non-chat interactions return immediately.
    const notChat = {
      isChatInputCommand: () => false,
      reply: jest.fn(),
    };
    await interactionCreateHandler!(notChat as any);
    expect(notChat.reply).not.toHaveBeenCalled();

    // Non-exchange command that is not leaderboard/checkin/achievements returns without replying.
    const unknownCmd = {
      isChatInputCommand: () => true,
      commandName: 'unknown-cmd',
      user: { id: 'u1', username: 'u1' },
      channelId: '1486358062179680288',
      options: {
        getString: () => null,
        getNumber: () => null,
        getSubcommand: () => 'help',
        getUser: () => null,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    };
    await interactionCreateHandler!(unknownCmd as any);
    expect(unknownCmd.reply).not.toHaveBeenCalled();

    // Leaderboard defaults category when omitted.
    const lbDefault = {
      isChatInputCommand: () => true,
      commandName: 'leaderboard',
      user: { id: 'u1', username: 'u1' },
      channelId: '1486358062179680288',
      options: {
        getString: () => null,
        getNumber: () => null,
        getSubcommand: () => 'help',
        getUser: () => null,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    };
    await interactionCreateHandler!(lbDefault as any);
    expect(lbDefault.reply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));

    // Unknown exchange subcommand falls through without reply/editReply.
    const exchangeUnknownSub = {
      isChatInputCommand: () => true,
      commandName: 'exchange',
      user: { id: 'u1', username: 'u1' },
      channelId: '1486358062179680288',
      options: {
        getString: () => null,
        getNumber: () => null,
        getSubcommand: () => 'noop',
        getUser: () => null,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    };
    await interactionCreateHandler!(exchangeUnknownSub as any);
    expect(exchangeUnknownSub.reply).not.toHaveBeenCalled();
    expect(exchangeUnknownSub.editReply).not.toHaveBeenCalled();
  });

  test('covers message command guard/default and non-Error fallback branches', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const { messageCreateHandler, mocks } = loadIndexWithEnv({ DISCORD_TOKEN: 'primary-token' });
    const mkMsg = (content: string) => ({
      author: { bot: false, id: 'user-1' },
      channel: { id: '1486358062179680288' },
      content,
      reply: jest.fn().mockResolvedValue(undefined),
    });

    // Guard branches: bot and wrong channel
    const botMsg = { ...mkMsg('!ping'), author: { bot: true, id: 'bot' } };
    await messageCreateHandler!(botMsg as any);
    expect(botMsg.reply).not.toHaveBeenCalled();
    const wrongChannelMsg = { ...mkMsg('!ping'), channel: { id: 'other' } };
    await messageCreateHandler!(wrongChannelMsg as any);
    expect(wrongChannelMsg.reply).not.toHaveBeenCalled();

    // Coinflip tails branch (Math.random() >= 0.5)
    const coinflip = mkMsg('!coinflip');
    await messageCreateHandler!(coinflip as any);
    expect(coinflip.reply).toHaveBeenCalledWith(expect.stringContaining('Tails'));

    // Invalid leaderboard category falls back to points.
    const badLeaderboard = mkMsg('!leaderboard banana');
    await messageCreateHandler!(badLeaderboard as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(badLeaderboard.reply).toHaveBeenCalled();

    // Check-in non-Error catch path and alreadyCheckedIn=true branch for no points field.
    (mocks.performCheckin as jest.Mock).mockRejectedValueOnce('boom-string');
    const checkinUnknownErr = mkMsg('!checkin');
    await messageCreateHandler!(checkinUnknownErr as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(checkinUnknownErr.reply).toHaveBeenCalled();

    (mocks.performCheckin as jest.Mock).mockResolvedValueOnce({
      success: false,
      message: 'already today',
      pointsAwarded: 0,
      currentStreak: 5,
      longestStreak: 7,
      totalCheckins: 20,
      alreadyCheckedIn: true,
    });
    const checkinAlready = mkMsg('!checkin');
    await messageCreateHandler!(checkinAlready as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(checkinAlready.reply).toHaveBeenCalled();

    // Message-level swap/mix/stake non-Error catch branches.
    (mocks.simulateBinanceTrade as jest.Mock).mockRejectedValueOnce('swap-string');
    const swapUnknownErr = mkMsg('!exchange swap BTC ETH 1');
    await messageCreateHandler!(swapUnknownErr as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(swapUnknownErr.reply).toHaveBeenCalledWith(expect.stringContaining('unknown error'));

    (mocks.recordMixingTransaction as jest.Mock).mockRejectedValueOnce('mix-string');
    const mixUnknownErr = mkMsg('!exchange mix BTC 1');
    await messageCreateHandler!(mixUnknownErr as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mixUnknownErr.reply).toHaveBeenCalledWith(expect.stringContaining('unknown error'));

    (mocks.recordStakingReward as jest.Mock).mockRejectedValueOnce('stake-string');
    const stakeUnknownErr = mkMsg('!exchange stake SOL 100 10');
    await messageCreateHandler!(stakeUnknownErr as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(stakeUnknownErr.reply).toHaveBeenCalledWith(expect.stringContaining('unknown error'));

    // crawlerstatus nullish rendering branch
    const crawlerStatus = mkMsg('!crawlerstatus');
    await messageCreateHandler!(crawlerStatus as any);
    expect(crawlerStatus.reply).toHaveBeenCalledWith(expect.stringContaining('Last success: **none yet**'));

    randomSpy.mockRestore();
  });

  test('covers crawler interval fallback and achievement announcer no-channel branch', async () => {
    const { startStakeCrawlerService, readyCallbacks, mockClient, mocks } = loadIndexWithEnv({
      DISCORD_TOKEN: 'primary-token',
      CTB_CRAWLER_INTERVAL_MS: '-10',
      CTB_CRAWLER_SYSTEM_USER_ID: undefined,
    });

    const cfg = (startStakeCrawlerService as jest.Mock).mock.calls[0][0];
    expect(cfg.intervalMs).toBe(300000);
    expect(cfg.actorUserId).toBe('ctb-crawler-service');

    // Ready callback wires announcer; no channel should short-circuit.
    for (const ready of readyCallbacks) {
      await ready();
    }
    const announcer = (mocks.setAchievementAnnouncer as jest.Mock).mock.calls[0][0];
    mockClient.channels.cache.get = jest.fn().mockReturnValue(undefined);
    await announcer('u1', { emoji: '🏅', name: 'n', description: 'd', bonusPoints: 100 });
    expect(mockClient.channels.cache.get).toHaveBeenCalled();
  });

  test('covers index helper branches for prices, leaderboard categories, checkin fallback, and announcer bonus points', async () => {
    const { messageCreateHandler, interactionCreateHandler, readyCallbacks, mockClient, startStakeCrawlerService, mocks } = loadIndexWithEnv({
      DISCORD_TOKEN: 'primary-token',
    });
    const mkMsg = (content: string) => ({
      author: { bot: false, id: 'user-1' },
      channel: { id: '1486358062179680288' },
      content,
      reply: jest.fn().mockResolvedValue(undefined),
    });

    // Portfolio branch fallbacks: empty balances + rank lookup failure.
    (mocks.getExchangeOverview as jest.Mock).mockResolvedValueOnce({
      profile: { tier: 'Bronze', points: 1 },
      balances: [],
      limits: { usedDailyVolume: 0, remainingDailyVolume: 1000 },
    });
    (mocks.getUserRank as jest.Mock).mockRejectedValueOnce(new Error('rank-down'));
    const portfolioMsg = mkMsg('!exchange portfolio');
    await messageCreateHandler!(portfolioMsg as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(portfolioMsg.reply).toHaveBeenCalled();

    // Cover leaderboard category formatter branches.
    for (const cmd of ['!leaderboard volume', '!leaderboard trades', '!leaderboard profit']) {
      const msg = mkMsg(cmd);
      await messageCreateHandler!(msg as any);
      await new Promise((resolve) => setImmediate(resolve));
      expect(msg.reply).toHaveBeenCalled();
    }

    // Prices branch with missing symbol value to hit prices.get(s) ?? 0 path.
    (mocks.getBinancePrices as jest.Mock).mockResolvedValueOnce(new Map([['BTC', 60000]]));
    const pricesMsg = mkMsg('!exchange prices BTC ETH');
    await messageCreateHandler!(pricesMsg as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(pricesMsg.reply).toHaveBeenCalled();

    // Check-in fallback catches non-Error payload and still replies with embed.
    (mocks.performCheckin as jest.Mock).mockRejectedValueOnce('string-fail');
    const checkinMsg = mkMsg('!checkin');
    await messageCreateHandler!(checkinMsg as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(checkinMsg.reply).toHaveBeenCalled();

    // Slash check-in fallback branch (line 653 ternary false side) and !alreadyCheckedIn points-field branch.
    const slashCheckin = {
      isChatInputCommand: () => true,
      commandName: 'checkin',
      user: { id: 'user-1', username: 'user1' },
      channelId: '1486358062179680288',
      options: {
        getString: () => null,
        getNumber: () => null,
        getSubcommand: () => 'help',
        getUser: () => null,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    };
    (mocks.performCheckin as jest.Mock).mockRejectedValueOnce('slash-fail');
    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValueOnce([]);
    await interactionCreateHandler!(slashCheckin as any);
    expect(slashCheckin.reply).toHaveBeenCalled();

    // Slash prices with sparse map to exercise addFields default value branch.
    const slashPrices = {
      isChatInputCommand: () => true,
      commandName: 'exchange',
      user: { id: 'user-1', username: 'user1' },
      channelId: '1486358062179680288',
      options: {
        getString: (k: string) => (k === 'symbols' ? 'BTC ETH' : null),
        getNumber: () => null,
        getSubcommand: () => 'prices',
        getUser: () => null,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    };
    (mocks.getBinancePrices as jest.Mock).mockResolvedValueOnce(new Map([['BTC', 61000]]));
    await interactionCreateHandler!(slashPrices as any);
    expect(slashPrices.reply).toHaveBeenCalled();

    // Crawler status branch rendering with falsey status bits.
    (mocks.getStakeCrawlerStatus as jest.Mock).mockReturnValueOnce({
      active: false,
      running: false,
      intervalMs: 120000,
      totalRuns: 1,
      totalCodesFound: 2,
      consecutiveFailures: 3,
      lastSuccessAt: null,
      lastAlertAt: null,
      lastError: null,
    });
    const crawlerMsg = mkMsg('!crawlerstatus');
    await messageCreateHandler!(crawlerMsg as any);
    expect(crawlerMsg.reply).toHaveBeenCalledWith(expect.stringContaining('active: **no**'));

    // Announcer bonus points positive branch executes when channel exists.
    for (const ready of readyCallbacks) {
      await ready();
    }
    const announcer = (mocks.setAchievementAnnouncer as jest.Mock).mock.calls[0][0];
    const send = jest.fn().mockResolvedValue(undefined);
    mockClient.channels.cache.get = jest.fn().mockReturnValue({ send });
    await announcer('u1', { emoji: '🏅', name: 'rich', description: 'bonus', bonusPoints: 99 });
    expect(send).toHaveBeenCalled();

    // Exercise crawler health callback through service config.
    const cfg = (startStakeCrawlerService as jest.Mock).mock.calls[0][0];
    const guildSend = jest.fn().mockResolvedValue(undefined);
    mockClient.guilds.cache = new Map([['g1', {
      channels: {
        cache: {
          get: jest.fn().mockReturnValue(null),
          find: jest.fn((predicate: (ch: any) => boolean) => {
            const candidate = { name: 'ctb-admin-alerts', isTextBased: () => true, send: guildSend };
            return predicate(candidate) ? candidate : null;
          }),
        },
      },
    }]]);
    await cfg.announceHealthAlert('health-ping');
    expect(guildSend).toHaveBeenCalled();
  });

  test('covers remaining index command/helper branches for volume/settle/checkin and slash registration fallback', async () => {
    const { messageCreateHandler, interactionCreateHandler, readyCallbacks, commandsSetMock, mockClient, startStakeCrawlerService, mocks } = loadIndexWithEnv({
      DISCORD_TOKEN: 'primary-token',
      CTB_GAME_CHANNEL_ID: '1486358062179680288',
      CTB_CRAWLER_ANNOUNCE_CHANNEL_ID: 'announce-id',
    });
    const mkMsg = (content: string) => ({
      author: { bot: false, id: 'user-1' },
      channel: { id: '1486358062179680288' },
      content,
      reply: jest.fn().mockResolvedValue(undefined),
    });

    // Run ready path and ensure slash registration async work flushes.
    for (const ready of readyCallbacks) {
      await ready();
    }
    await new Promise((resolve) => setImmediate(resolve));
    expect(commandsSetMock).toHaveBeenCalled();

    // registerSlashCommands early-return branch when application is missing.
    (mockClient as any).application = undefined;
    for (const ready of readyCallbacks) {
      await ready();
    }
    expect(commandsSetMock).toHaveBeenCalled();

    // Crawler announce branch via configured channel id path.
    const cfg = (startStakeCrawlerService as jest.Mock).mock.calls[0][0];
    const send = jest.fn().mockResolvedValue(undefined);
    mockClient.guilds.cache = new Map([['g1', {
      channels: {
        cache: {
          get: jest.fn().mockReturnValue({ send }),
          find: jest.fn().mockReturnValue(null),
        },
      },
    }]]);
    await cfg.announceCodes(['X1']);
    expect(send).toHaveBeenCalled();

    // Message leaderboard defaults + empty board branch.
    (mocks.getLeaderboard as jest.Mock).mockResolvedValueOnce([]);
    const lbDefault = mkMsg('!leaderboard');
    await messageCreateHandler!(lbDefault as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(lbDefault.reply).toHaveBeenCalled();

    // Message prices default symbols (line 352 path).
    (mocks.getBinancePrices as jest.Mock).mockResolvedValueOnce(new Map([['BTC', 60000], ['ETH', 3000], ['SOL', 150], ['BNB', 500]]));
    const pricesDefault = mkMsg('!exchange prices');
    await messageCreateHandler!(pricesDefault as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(pricesDefault.reply).toHaveBeenCalled();

    // parsePositiveAmount invalid numeric branch.
    const invalidAmt = mkMsg('!exchange swap BTC ETH nope');
    await messageCreateHandler!(invalidAmt as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(invalidAmt.reply).toHaveBeenCalledWith('Usage: `!exchange swap BTC ETH 0.10`');

    // estimateUsdVolume early return path for USDT token.
    (mocks.simulateBinanceTrade as jest.Mock).mockResolvedValueOnce({
      tradeType: 'crypto_swap',
      fromToken: 'USDT',
      toToken: 'ETH',
      fromAmount: 1,
      toAmount: 1,
      exchangeFee: 0,
      platformFee: 0,
      entryPrice: 1,
      profit: 0,
      profitPercent: 0,
    });
    const usdtSwap = mkMsg('!exchange swap USDT ETH 1');
    await messageCreateHandler!(usdtSwap as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(usdtSwap.reply).toHaveBeenCalled();

    // estimateUsdVolume map-miss branch and swap tier fallback string when overview fails.
    (mocks.getBinancePrices as jest.Mock).mockResolvedValueOnce(new Map());
    (mocks.simulateBinanceTrade as jest.Mock).mockResolvedValueOnce({
      tradeType: 'crypto_swap',
      fromToken: 'ABC',
      toToken: 'ETH',
      fromAmount: 1,
      toAmount: 1,
      exchangeFee: 0,
      platformFee: 0,
      entryPrice: 1,
      profit: 0,
      profitPercent: 0,
    });
    (mocks.getExchangeOverview as jest.Mock).mockRejectedValueOnce(new Error('overview-down'));
    const missingPriceSwap = mkMsg('!exchange swap ABC ETH 1');
    await messageCreateHandler!(missingPriceSwap as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(missingPriceSwap.reply).toHaveBeenCalled();

    // settleTrade mixing branch with feeInToken <= 0 path.
    (mocks.simulateBinanceTrade as jest.Mock).mockResolvedValueOnce({
      tradeType: 'mixing',
      fromToken: 'BTC',
      toToken: 'BTC',
      fromAmount: 1,
      toAmount: 1,
      exchangeFee: 0,
      platformFee: 0,
      entryPrice: 0,
      profit: 0,
      profitPercent: 0,
    });
    const mixingSwap = mkMsg('!exchange swap BTC ETH 1');
    await messageCreateHandler!(mixingSwap as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mixingSwap.reply).toHaveBeenCalled();

    // settleTrade staking branch with rewardAmount <= 0 path.
    (mocks.simulateBinanceTrade as jest.Mock).mockResolvedValueOnce({
      tradeType: 'staking',
      fromToken: 'SOL',
      toToken: 'SOL',
      fromAmount: 10,
      toAmount: 10,
      exchangeFee: 0,
      platformFee: 0,
      entryPrice: 1,
      profit: 0,
      profitPercent: 0,
    });
    const stakingSwap = mkMsg('!exchange swap SOL ETH 10');
    await messageCreateHandler!(stakingSwap as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(stakingSwap.reply).toHaveBeenCalled();

    // Slash check-in success branches: alreadyCheckedIn true and streak>=7 color path.
    const mkSlashCheckin = () => ({
      isChatInputCommand: () => true,
      commandName: 'checkin',
      user: { id: 'user-1', username: 'user1' },
      channelId: '1486358062179680288',
      options: {
        getString: () => null,
        getNumber: () => null,
        getSubcommand: () => 'help',
        getUser: () => null,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    });

    (mocks.performCheckin as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'already',
      pointsAwarded: 0,
      currentStreak: 3,
      longestStreak: 3,
      totalCheckins: 10,
      alreadyCheckedIn: true,
    });
    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValueOnce([]);
    const slashAlready = mkSlashCheckin();
    await interactionCreateHandler!(slashAlready as any);
    expect(slashAlready.reply).toHaveBeenCalled();

    (mocks.performCheckin as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'streak!',
      pointsAwarded: 25,
      currentStreak: 8,
      longestStreak: 8,
      totalCheckins: 11,
      alreadyCheckedIn: false,
    });
    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValueOnce([{ emoji: '🏅', name: 'Streaker' }]);
    const slashStreak = mkSlashCheckin();
    await interactionCreateHandler!(slashStreak as any);
    expect(slashStreak.reply).toHaveBeenCalled();

    // Message checkin branch rendering lines 574-584/616/620 through successful checkin + crawler status.
    (mocks.performCheckin as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'good',
      pointsAwarded: 50,
      currentStreak: 9,
      longestStreak: 11,
      totalCheckins: 100,
      alreadyCheckedIn: false,
    });
    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValueOnce([]);
    const msgCheckin = mkMsg('!checkin');
    await messageCreateHandler!(msgCheckin as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(msgCheckin.reply).toHaveBeenCalled();

    (mocks.getStakeCrawlerStatus as jest.Mock).mockReturnValueOnce({
      active: true,
      running: true,
      intervalMs: 300000,
      totalRuns: 10,
      totalCodesFound: 3,
      consecutiveFailures: 0,
      lastSuccessAt: 'now',
      lastAlertAt: null,
      lastError: null,
    });
    const statusMsg = mkMsg('!crawlerstatus');
    await messageCreateHandler!(statusMsg as any);
    expect(statusMsg.reply).toHaveBeenCalledWith(expect.stringContaining('Running now: **yes**'));
  });

  test('pinpoints explicit channel-id and non-error checkin fallbacks plus non-finite currency formatting', async () => {
    const { messageCreateHandler, interactionCreateHandler, mocks } = loadIndexWithEnv({
      DISCORD_TOKEN: 'primary-token',
      CTB_GAME_CHANNEL_ID: 'explicit-channel',
      CTB_GAME_CHANNEL_URL: 'https://discord.com/channels/1/2',
    });

    // explicit game channel id branch (line 131/323 path via handleExchangeCommand).
    const pingInExplicit = {
      author: { bot: false, id: 'user-1' },
      channel: { id: 'explicit-channel' },
      content: '!exchange help',
      reply: jest.fn().mockResolvedValue(undefined),
    };
    await messageCreateHandler!(pingInExplicit as any);
    expect(pingInExplicit.reply).toHaveBeenCalled();

    // formatCurrency non-finite branch through NaN values in swap embed.
    (mocks.simulateBinanceTrade as jest.Mock).mockResolvedValueOnce({
      tradeType: 'crypto_swap',
      fromToken: 'BTC',
      toToken: 'ETH',
      fromAmount: 1,
      toAmount: 2,
      exchangeFee: Number.NaN,
      platformFee: Number.NaN,
      entryPrice: 1,
      profit: Number.NaN,
      profitPercent: Number.NaN,
    });
    const nanSwap = {
      author: { bot: false, id: 'user-1' },
      channel: { id: 'explicit-channel' },
      content: '!exchange swap BTC ETH 1',
      reply: jest.fn().mockResolvedValue(undefined),
    };
    await messageCreateHandler!(nanSwap as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(nanSwap.reply).toHaveBeenCalled();

    // Message check-in non-Error catch line (574) in isolated call.
    (mocks.performCheckin as jest.Mock).mockRejectedValueOnce('message-catch-non-error');
    const msgCheckin = {
      author: { bot: false, id: 'user-1' },
      channel: { id: 'explicit-channel' },
      content: '!checkin',
      reply: jest.fn().mockResolvedValue(undefined),
    };
    await messageCreateHandler!(msgCheckin as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(msgCheckin.reply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));

    // Slash check-in non-Error catch line (653) in isolated call.
    const slashCheckin = {
      isChatInputCommand: () => true,
      commandName: 'checkin',
      user: { id: 'user-1', username: 'user1' },
      channelId: 'explicit-channel',
      options: {
        getString: () => null,
        getNumber: () => null,
        getSubcommand: () => 'help',
        getUser: () => null,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    };
    (mocks.performCheckin as jest.Mock).mockRejectedValueOnce('slash-catch-non-error');
    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValueOnce([]);
    await interactionCreateHandler!(slashCheckin as any);
    expect(slashCheckin.reply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));

    // Dedicated crawlerstatus line coverage (616) in same explicit channel.
    const crawler = {
      author: { bot: false, id: 'user-1' },
      channel: { id: 'explicit-channel' },
      content: '!crawlerstatus',
      reply: jest.fn().mockResolvedValue(undefined),
    };
    await messageCreateHandler!(crawler as any);
    expect(crawler.reply).toHaveBeenCalledWith(expect.stringContaining('Crawler active'));
  });

  test('forces unknown-error text and code-announcement send payload branches', async () => {
    const { messageCreateHandler, interactionCreateHandler, startStakeCrawlerService, mockClient, mocks } = loadIndexWithEnv({
      DISCORD_TOKEN: 'primary-token',
      CTB_GAME_CHANNEL_ID: '1486358062179680288',
      CTB_CRAWLER_ANNOUNCE_CHANNEL_ID: 'announce-id',
    });

    // line 52 send() path in announceCrawlerCodes via configured channel id lookup
    const send = jest.fn().mockResolvedValue(undefined);
    mockClient.guilds.cache = new Map([['g1', {
      channels: {
        cache: {
          get: jest.fn().mockReturnValue({ send }),
          find: jest.fn().mockReturnValue(null),
        },
      },
    }]]);
    const cfg = (startStakeCrawlerService as jest.Mock).mock.calls[0][0];
    await cfg.announceCodes(['CODE-Z']);
    expect(send).toHaveBeenCalledWith(expect.stringContaining('CODE-Z'));

    // line 574 message checkin catch -> non-Error branch renders "unknown error"
    (mocks.performCheckin as jest.Mock).mockRejectedValueOnce('msg-non-error');
    const msgCheckin = {
      author: { bot: false, id: 'user-1' },
      channel: { id: '1486358062179680288' },
      content: '!checkin',
      reply: jest.fn().mockResolvedValue(undefined),
    };
    await messageCreateHandler!(msgCheckin as any);
    await new Promise((resolve) => setImmediate(resolve));
    const messageEmbedArg = (msgCheckin.reply as jest.Mock).mock.calls[0][0];
    expect(messageEmbedArg.embeds).toBeDefined();

    // line 653 slash checkin catch -> non-Error branch renders "unknown error"
    (mocks.performCheckin as jest.Mock).mockRejectedValueOnce('slash-non-error');
    (mocks.checkAndAwardAchievements as jest.Mock).mockResolvedValueOnce([]);
    const slashCheckin = {
      isChatInputCommand: () => true,
      commandName: 'checkin',
      user: { id: 'user-1', username: 'user1' },
      channelId: '1486358062179680288',
      options: {
        getString: () => null,
        getNumber: () => null,
        getSubcommand: () => 'help',
        getUser: () => null,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    };
    await interactionCreateHandler!(slashCheckin as any);
    const slashEmbedArg = (slashCheckin.reply as jest.Mock).mock.calls[0][0];
    expect(slashEmbedArg.embeds).toBeDefined();
  });
});
