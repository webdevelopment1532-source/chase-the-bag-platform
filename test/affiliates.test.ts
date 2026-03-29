jest.mock('../src/db');
jest.mock('../src/audit-log');

import { getDbConnection } from '../src/db';
import { logOperation } from '../src/audit-log';
import { registerAffiliateCommands } from '../src/affiliates';

const mockExecute = jest.fn();
const mockEnd = jest.fn().mockResolvedValue(undefined);
const mockConn = { execute: mockExecute, end: mockEnd };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;
const mockLog = logOperation as jest.MockedFunction<typeof logOperation>;

function makeMessage(content: string, authorId: string, ownerId: string, guildId = 'g1') {
  return {
    content,
    author: {
      id: authorId,
      bot: false,
      tag: `user#${authorId}`,
      send: jest.fn().mockResolvedValue(undefined),
    },
    guild: { id: guildId },
    reply: jest.fn().mockResolvedValue(undefined),
  } as any;
}

function makeClient(handler?: (msg: any) => void) {
  const listeners: Record<string, Function> = {};
  return {
    on: (event: string, cb: Function) => { listeners[event] = cb; },
    users: { fetch: jest.fn().mockResolvedValue({ send: jest.fn().mockResolvedValue(undefined) }) },
    _emit: (event: string, arg: any) => listeners[event]?.(arg),
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockConn as any);
  mockLog.mockResolvedValue(undefined);
});

const OWNER = 'owner123';

describe('registerAffiliateCommands — !affiliate request', () => {
  test('sends pending request when no existing record', async () => {
    mockExecute
      .mockResolvedValueOnce([[]])  // SELECT status — no record
      .mockResolvedValueOnce([[]]);  // INSERT pending
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate request', 'user1', OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('submitted'));
  });

  test('rejects duplicate pending/active request', async () => {
    mockExecute.mockResolvedValueOnce([[{ status: 'pending' }]]);
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate request', 'user2', OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('already'));
  });

  test('rejects duplicate active request', async () => {
    mockExecute.mockResolvedValueOnce([[{ status: 'active' }]]);
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate request', 'user2', OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('already'));
  });

  test('handles DB error gracefully', async () => {
    mockExecute.mockRejectedValueOnce(new Error('DB down'));
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate request', 'errUser', OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('try again'));
  });

  test('uses dm server fallback in request log when guild is undefined', async () => {
    mockExecute
      .mockResolvedValueOnce([[]])   // no existing record
      .mockResolvedValueOnce([[]]); // INSERT succeeds
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate request', 'newUser99', OWNER);
    msg.guild = undefined;
    await client._emit('messageCreate', msg);
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ serverId: 'dm' }));
  });
});

describe('registerAffiliateCommands — !affiliate approve (owner only)', () => {
  test('approves pending user', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ status: 'pending' }]])  // SELECT
      .mockResolvedValueOnce([[]]);  // UPDATE
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage(`!affiliate approve targetUser`, OWNER, OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('approved'));
  });

  test('uses dm server id fallback in audit logging when guild is missing', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ status: 'pending' }]])
      .mockResolvedValueOnce([[]]);
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate approve targetUser', OWNER, OWNER);
    msg.guild = undefined;

    await client._emit('messageCreate', msg);

    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ serverId: 'dm' }));
  });

  test('rejects approve when no pending request exists', async () => {
    mockExecute.mockResolvedValueOnce([[]]); // no pending record
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate approve ghost', OWNER, OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('No pending'));
  });

  test('handles approve DB error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db fail'));
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate approve ghost', OWNER, OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Database error'));
  });
});

describe('registerAffiliateCommands — !affiliate remove (owner only)', () => {
  test('removes active affiliate', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ status: 'active' }]])  // SELECT
      .mockResolvedValueOnce([[]]);  // UPDATE
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate remove activeUser', OWNER, OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('removed'));
  });

  test('uses dm server id fallback in remove audit logging when guild is missing', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ status: 'active' }]])
      .mockResolvedValueOnce([[]]);
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate remove activeUser', OWNER, OWNER);
    msg.guild = undefined;

    await client._emit('messageCreate', msg);

    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ serverId: 'dm' }));
  });

  test('informs when user is not an active affiliate', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate remove nobody', OWNER, OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('not an active'));
  });

  test('handles remove DB error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db fail'));
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate remove target', OWNER, OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Database error'));
  });
});

describe('registerAffiliateCommands — !affiliate list (owner only)', () => {
  test('lists active affiliates', async () => {
    mockExecute.mockResolvedValueOnce([[{ user_id: 'u1' }, { user_id: 'u2' }]]);
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate list', OWNER, OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Affiliates'));
  });

  test('uses dm server id fallback in list audit logging when guild is missing', async () => {
    mockExecute.mockResolvedValueOnce([[{ user_id: 'u1' }]]);
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate list', OWNER, OWNER);
    msg.guild = undefined;

    await client._emit('messageCreate', msg);

    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ serverId: 'dm' }));
  });

  test('reports no affiliates when list is empty', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate list', OWNER, OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('No affiliates'));
  });

  test('handles list DB error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db fail'));
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate list', OWNER, OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Database error'));
  });
});

describe('registerAffiliateCommands — !affiliate link', () => {
  test('sends link to active affiliate', async () => {
    mockExecute.mockResolvedValueOnce([[{ user_id: 'u1' }]]);
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate link', 'u1', OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('stake.us'));
  });

  test('uses dm server id fallback in link audit logging when guild is missing', async () => {
    mockExecute.mockResolvedValueOnce([[{ user_id: 'u1' }]]);
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate link', 'u1', OWNER);
    msg.guild = undefined;

    await client._emit('messageCreate', msg);

    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ serverId: 'dm' }));
  });

  test('silently ignores non-affiliates', async () => {
    mockExecute.mockResolvedValueOnce([[]]); // not an affiliate
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate link', 'nonAffiliate', OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).not.toHaveBeenCalled();
  });
});

describe('registerAffiliateCommands — bot messages', () => {
  test('ignores messages from bots', async () => {
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate request', 'bot1', OWNER);
    msg.author.bot = true;
    await client._emit('messageCreate', msg);
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe('registerAffiliateCommands — unrecognized subcommand', () => {
  test('falls through silently when subcommand is unrecognized', async () => {
    const client = makeClient();
    registerAffiliateCommands(client, OWNER);
    const msg = makeMessage('!affiliate unknown', 'u1', OWNER);
    await client._emit('messageCreate', msg);
    expect(msg.reply).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
