import {
  acceptExchangeOffer,
  cancelExchangeOffer,
  createExchangeOffer,
  grantCoins,
  getCoinExchangeOverview,
  getCoinWallet,
  listCoinOffers,
  listCoinTransactions,
  listUserOffers,
  listUserTransactions,
  listCoinWallets,
  parseCoinAmount,
  transferCoins,
} from '../src/coin-exchange';
import { getDbConnection } from '../src/db';
import { logOperation } from '../src/audit-log';

jest.mock('../src/db', () => ({
  getDbConnection: jest.fn(),
}));

jest.mock('../src/audit-log', () => ({
  logOperation: jest.fn(),
}));

describe('coin exchange deep tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('parseCoinAmount validates and rounds input', () => {
    expect(parseCoinAmount('abc')).toBeNull();
    expect(parseCoinAmount('-1')).toBeNull();
    expect(parseCoinAmount('0')).toBeNull();
    expect(parseCoinAmount('1.239')).toBe(1.24);
  });

  test('getCoinWallet ensures wallet, maps numeric values, and closes connection', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([{}, []])
      .mockResolvedValueOnce([[{ user_id: 'u1', available_balance: '10.125', locked_balance: 2 }], []]);
    const end = jest.fn().mockResolvedValue(undefined);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute, end });

    const wallet = await getCoinWallet('u1');

    expect(wallet).toEqual({
      userId: 'u1',
      availableBalance: 10.13,
      lockedBalance: 2,
      totalBalance: 12.13,
    });
    expect(execute).toHaveBeenNthCalledWith(
      1,
      'INSERT IGNORE INTO coin_wallets (user_id) VALUES (?)',
      ['u1']
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      'SELECT user_id, available_balance, locked_balance FROM coin_wallets WHERE user_id = ?',
      ['u1']
    );
    expect(end).toHaveBeenCalledTimes(1);
  });

  test('transferCoins rejects self-transfer before opening db connection', async () => {
    await expect(
      transferCoins({ fromUserId: 'same', toUserId: 'same', amount: 5, serverId: 'guild-1' })
    ).rejects.toThrow('You cannot transfer coins to yourself.');

    expect(getDbConnection).not.toHaveBeenCalled();
  });

  test('transferCoins rolls back when sender has insufficient funds', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql === 'INSERT IGNORE INTO coin_wallets (user_id) VALUES (?)') {
        return Promise.resolve([{}, []]);
      }
      if (sql.includes('FROM coin_wallets WHERE user_id = ? FOR UPDATE')) {
        const userId = (params as string[])[0];
        if (userId === 'sender') {
          return Promise.resolve([[{ user_id: 'sender', available_balance: 2, locked_balance: 0 }], []]);
        }
      }
      return Promise.resolve([[], []]);
    });

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    await expect(
      transferCoins({ fromUserId: 'sender', toUserId: 'receiver', amount: 5, serverId: 'guild-1' })
    ).rejects.toThrow('Insufficient available balance.');

    expect(beginTransaction).toHaveBeenCalledTimes(1);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
    expect(end).toHaveBeenCalledTimes(1);
    expect(logOperation).not.toHaveBeenCalled();
  });

  test('transferCoins updates balances, writes transactions, commits, and audits', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql === 'INSERT IGNORE INTO coin_wallets (user_id) VALUES (?)') {
        return Promise.resolve([{}, []]);
      }

      if (sql.includes('FROM coin_wallets WHERE user_id = ? FOR UPDATE')) {
        const userId = (params as string[])[0];
        if (userId === 'sender') {
          return Promise.resolve([[{ user_id: 'sender', available_balance: 10, locked_balance: 1 }], []]);
        }
        if (userId === 'receiver') {
          return Promise.resolve([[{ user_id: 'receiver', available_balance: 3, locked_balance: 0 }], []]);
        }
      }

      return Promise.resolve([{}, []]);
    });

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    await transferCoins({ fromUserId: 'sender', toUserId: 'receiver', amount: 4.5, serverId: 'guild-9' });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(rollback).not.toHaveBeenCalled();
    expect(end).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      'UPDATE coin_wallets SET available_balance = ? WHERE user_id = ?',
      [5.5, 'guild-9:sender']
    );
    expect(execute).toHaveBeenCalledWith(
      'UPDATE coin_wallets SET available_balance = ? WHERE user_id = ?',
      [7.5, 'guild-9:receiver']
    );
    expect(logOperation).toHaveBeenCalledWith({
      userId: 'sender',
      serverId: 'guild-9',
      action: 'coin_exchange_transfer',
      details: 'Transferred 4.50 coins to receiver',
    });
  });

  test('listCoinOffers uses status-filtered and unfiltered query branches', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ id: 1, sender_user_id: 'a', recipient_user_id: 'b', amount: '1.20', status: 'open', note: null, created_at: 't1', updated_at: 't1', accepted_at: null, cancelled_at: null }], []])
      .mockResolvedValueOnce([[{ id: 2, sender_user_id: 'x', recipient_user_id: 'y', amount: 2, status: 'accepted', note: 'ok', created_at: 't2', updated_at: 't2', accepted_at: 't2', cancelled_at: null }], []]);
    const end = jest.fn().mockResolvedValue(undefined);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute, end });

    const filtered = await listCoinOffers(20, 'open');
    const unfiltered = await listCoinOffers(10, '');

    expect(filtered[0]).toEqual(
      expect.objectContaining({ id: 1, senderUserId: 'a', recipientUserId: 'b', amount: 1.2, status: 'open' })
    );
    expect(unfiltered[0]).toEqual(
      expect.objectContaining({ id: 2, senderUserId: 'x', recipientUserId: 'y', amount: 2, status: 'accepted' })
    );
    expect(execute).toHaveBeenNthCalledWith(
      1,
      'SELECT * FROM coin_exchange_offers WHERE status = ? ORDER BY created_at DESC LIMIT ?',
      ['open', 20]
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      'SELECT * FROM coin_exchange_offers ORDER BY created_at DESC LIMIT ?',
      [10]
    );
    expect(end).toHaveBeenCalledTimes(2);
  });

  test('listCoinTransactions and listCoinWallets map values and enforce query branches', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ id: 1, user_id: 'u1', counterparty_user_id: 'u2', direction: 'credit', kind: 'transfer', amount: '9.99', balance_after: '10.01', offer_id: null, details: 'd', created_at: 't' }], []])
      .mockResolvedValueOnce([[{ id: 2, user_id: 'u3', counterparty_user_id: null, direction: 'debit', kind: 'offer_lock', amount: 3, balance_after: 7, offer_id: 4, details: null, created_at: 't2' }], []])
      .mockResolvedValueOnce([[{ user_id: 'wx', available_balance: '3.33', locked_balance: '1.67' }], []]);
    const end = jest.fn().mockResolvedValue(undefined);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute, end });

    const byUser = await listCoinTransactions(5, 'u1');
    const all = await listCoinTransactions(2, '');
    const wallets = await listCoinWallets(1);

    expect(byUser[0]).toEqual(
      expect.objectContaining({ userId: 'u1', amount: 9.99, balanceAfter: 10.01, kind: 'transfer' })
    );
    expect(all[0]).toEqual(
      expect.objectContaining({ userId: 'u3', amount: 3, offerId: 4, direction: 'debit' })
    );
    expect(wallets[0]).toEqual(
      expect.objectContaining({ userId: 'wx', availableBalance: 3.33, lockedBalance: 1.67, totalBalance: 5 })
    );
    expect(end).toHaveBeenCalledTimes(3);
  });

  test('getCoinExchangeOverview maps aggregate totals', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ total: 4 }], []])
      .mockResolvedValueOnce([[{ total: '99.995' }], []])
      .mockResolvedValueOnce([[{ total: 11.111 }], []])
      .mockResolvedValueOnce([[{ total: 2 }], []])
      .mockResolvedValueOnce([[{ total: 88 }], []]);
    const end = jest.fn().mockResolvedValue(undefined);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute, end });

    const overview = await getCoinExchangeOverview();

    expect(overview).toEqual({
      wallets: 4,
      totalSupply: 100,
      lockedSupply: 11.11,
      openOffers: 2,
      transactions: 88,
    });
    expect(end).toHaveBeenCalledTimes(1);
  });

  test('grantCoins updates wallet, writes transaction, and audits', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest
      .fn()
      .mockResolvedValueOnce([{}, []])
      .mockResolvedValueOnce([[{ user_id: 'target', available_balance: 2, locked_balance: 0 }], []])
      .mockResolvedValueOnce([{}, []])
      .mockResolvedValueOnce([{}, []])
      .mockResolvedValueOnce([{}, []])
      .mockResolvedValueOnce([[{ user_id: 'target', available_balance: 5.5, locked_balance: 0 }], []]);

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    const wallet = await grantCoins({
      actorUserId: 'admin',
      targetUserId: 'target',
      amount: 3.5,
      serverId: 'guild',
      details: 'manual grant',
    });

    expect(wallet).toEqual({
      userId: 'target',
      availableBalance: 5.5,
      lockedBalance: 0,
      totalBalance: 5.5,
    });
    expect(commit).toHaveBeenCalledTimes(1);
    expect(rollback).not.toHaveBeenCalled();
    expect(logOperation).toHaveBeenCalledWith({
      userId: 'admin',
      serverId: 'guild',
      action: 'coin_exchange_grant',
      details: 'Granted 3.50 coins to target',
    });
  });

  test('grantCoins rolls back and rethrows when update fails', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest
      .fn()
      .mockResolvedValueOnce([{}, []])
      .mockResolvedValueOnce([[{ user_id: 'target', available_balance: 2, locked_balance: 0 }], []])
      .mockRejectedValueOnce(new Error('update failed'));

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    await expect(
      grantCoins({
        actorUserId: 'admin',
        targetUserId: 'target',
        amount: 1,
        serverId: 'guild',
      })
    ).rejects.toThrow('update failed');

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
    expect(logOperation).not.toHaveBeenCalled();
  });

  test('grantCoins stores null details when optional details are omitted', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest
      .fn()
      .mockResolvedValueOnce([{}, []])
      .mockResolvedValueOnce([[{ user_id: 'target', available_balance: 1, locked_balance: 0 }], []])
      .mockResolvedValueOnce([{}, []])
      .mockResolvedValueOnce([{}, []])
      .mockResolvedValueOnce([{}, []])
      .mockResolvedValueOnce([[{ user_id: 'target', available_balance: 2, locked_balance: 0 }], []]);

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    await grantCoins({
      actorUserId: 'admin',
      targetUserId: 'target',
      amount: 1,
      serverId: 'guild',
    });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO coin_exchange_transactions'),
      expect.arrayContaining(['guild:target', 'guild:admin', 'credit', 'grant', 1, 2, null, null])
    );
  });

  test('createExchangeOffer validates sender and recipient are different', async () => {
    await expect(
      createExchangeOffer({
        senderUserId: 'u1',
        recipientUserId: 'u1',
        amount: 1,
        serverId: 'guild',
      })
    ).rejects.toThrow('You cannot create an offer to yourself.');
  });

  test('createExchangeOffer locks funds, creates offer, and audits', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql === 'INSERT IGNORE INTO coin_wallets (user_id) VALUES (?)') return Promise.resolve([{}, []]);
      if (sql.includes('FROM coin_wallets WHERE user_id = ? FOR UPDATE')) {
        return Promise.resolve([[{ user_id: 'sender', available_balance: 10, locked_balance: 1 }], []]);
      }
      if (sql.startsWith('INSERT INTO coin_exchange_offers')) {
        return Promise.resolve([{ insertId: 77 }, []]);
      }
      return Promise.resolve([{}, []]);
    });

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    const offerId = await createExchangeOffer({
      senderUserId: 'sender',
      recipientUserId: 'recipient',
      amount: 4,
      note: 'trade',
      serverId: 'guild',
    });

    expect(offerId).toBe(77);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(rollback).not.toHaveBeenCalled();
    expect(logOperation).toHaveBeenCalledWith({
      userId: 'sender',
      serverId: 'guild',
      action: 'coin_exchange_offer_create',
      details: 'Created offer 77 for recipient amount 4.00',
    });
  });

  test('createExchangeOffer uses null note and default transaction details when note is omitted', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest.fn().mockImplementation((sql: string) => {
      if (sql === 'INSERT IGNORE INTO coin_wallets (user_id) VALUES (?)') return Promise.resolve([{}, []]);
      if (sql.includes('FROM coin_wallets WHERE user_id = ? FOR UPDATE')) {
        return Promise.resolve([[{ user_id: 'sender', available_balance: 10, locked_balance: 0 }], []]);
      }
      if (sql.startsWith('INSERT INTO coin_exchange_offers')) {
        return Promise.resolve([{ insertId: 88 }, []]);
      }
      return Promise.resolve([{}, []]);
    });

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    await createExchangeOffer({
      senderUserId: 'sender',
      recipientUserId: 'recipient',
      amount: 2,
      serverId: 'guild',
    });

    expect(execute).toHaveBeenCalledWith(
      'INSERT INTO coin_exchange_offers (sender_user_id, recipient_user_id, amount, note) VALUES (?, ?, ?, ?)',
      ['guild:sender', 'guild:recipient', 2, null]
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO coin_exchange_transactions'),
      expect.arrayContaining(['guild:sender', 'guild:recipient', 'debit', 'offer_lock', 2, 8, 88, 'Offer created'])
    );
  });

  test('acceptExchangeOffer rejects non-open or wrong-recipient offers', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const executeClosed = jest
      .fn()
      .mockResolvedValueOnce([[{ id: 5, status: 'accepted', recipient_user_id: 'r', sender_user_id: 's', amount: 2, note: null }], []]);

    (getDbConnection as jest.Mock).mockResolvedValueOnce({
      beginTransaction,
      execute: executeClosed,
      rollback,
      commit,
      end,
    });

    await expect(
      acceptExchangeOffer({ recipientUserId: 'r', offerId: 5, serverId: 'guild' })
    ).rejects.toThrow('That offer is not open anymore.');

    const executeWrongRecipient = jest
      .fn()
      .mockResolvedValueOnce([[{ id: 6, status: 'open', recipient_user_id: 'other', sender_user_id: 's', amount: 2, note: null }], []]);

    (getDbConnection as jest.Mock).mockResolvedValueOnce({
      beginTransaction,
      execute: executeWrongRecipient,
      rollback,
      commit,
      end,
    });

    await expect(
      acceptExchangeOffer({ recipientUserId: 'r', offerId: 6, serverId: 'guild' })
    ).rejects.toThrow('You are not the recipient for that offer.');

    expect(commit).not.toHaveBeenCalled();
    expect(rollback).toHaveBeenCalledTimes(2);
  });

  test('cancelExchangeOffer rejects non-sender cancellation attempts', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ id: 8, status: 'open', sender_user_id: 'owner', recipient_user_id: 'r', amount: 1 }], []]);

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    await expect(
      cancelExchangeOffer({ requesterUserId: 'intruder', offerId: 8, serverId: 'guild' })
    ).rejects.toThrow('Only the sender can cancel that offer.');

    expect(commit).not.toHaveBeenCalled();
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(logOperation).not.toHaveBeenCalled();
  });

  test('listUserOffers and listUserTransactions map rows', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ id: 2, sender_user_id: 'u1', recipient_user_id: 'u2', amount: '5.50', status: 'open', note: null, created_at: 'x', updated_at: 'x', accepted_at: null, cancelled_at: null }], []])
      .mockResolvedValueOnce([[{ id: 3, user_id: 'u1', counterparty_user_id: 'u2', direction: 'debit', kind: 'transfer', amount: 2, balance_after: '8.00', offer_id: null, details: 't', created_at: 'y' }], []]);
    const end = jest.fn().mockResolvedValue(undefined);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute, end });

    const offers = await listUserOffers('u1');
    const txs = await listUserTransactions('u1', 7);

    expect(offers[0]).toEqual(
      expect.objectContaining({ id: 2, senderUserId: 'u1', recipientUserId: 'u2', amount: 5.5 })
    );
    expect(txs[0]).toEqual(
      expect.objectContaining({ id: 3, userId: 'u1', counterpartyUserId: 'u2', balanceAfter: 8 })
    );
    expect(end).toHaveBeenCalledTimes(2);
  });

  test('createExchangeOffer rolls back when available balance is insufficient', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest.fn().mockImplementation((sql: string) => {
      if (sql === 'INSERT IGNORE INTO coin_wallets (user_id) VALUES (?)') return Promise.resolve([{}, []]);
      if (sql.includes('FROM coin_wallets WHERE user_id = ? FOR UPDATE')) {
        return Promise.resolve([[{ user_id: 'sender', available_balance: 1, locked_balance: 0 }], []]);
      }
      return Promise.resolve([{}, []]);
    });

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    await expect(
      createExchangeOffer({ senderUserId: 'sender', recipientUserId: 'recipient', amount: 5, serverId: 'guild' })
    ).rejects.toThrow('Insufficient available balance to create that offer.');

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
  });

  test('acceptExchangeOffer rejects when sender locked balance is insufficient', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('FROM coin_exchange_offers WHERE id = ? FOR UPDATE')) {
        return Promise.resolve([[{ id: 11, status: 'open', recipient_user_id: 'recipient', sender_user_id: 'sender', amount: 4, note: null }], []]);
      }
      if (sql === 'INSERT IGNORE INTO coin_wallets (user_id) VALUES (?)') {
        return Promise.resolve([{}, []]);
      }
      if (sql.includes('FROM coin_wallets WHERE user_id = ? FOR UPDATE')) {
        const userId = (params as string[])[0];
        if (userId === 'sender') {
          return Promise.resolve([[{ user_id: 'sender', available_balance: 2, locked_balance: 3 }], []]);
        }
        return Promise.resolve([[{ user_id: 'recipient', available_balance: 0, locked_balance: 0 }], []]);
      }
      return Promise.resolve([{}, []]);
    });

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    await expect(
      acceptExchangeOffer({ recipientUserId: 'recipient', offerId: 11, serverId: 'guild' })
    ).rejects.toThrow('The sender no longer has enough locked balance for this offer.');

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
  });

  test('acceptExchangeOffer completes success path and writes audit log', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('FROM coin_exchange_offers WHERE id = ? FOR UPDATE')) {
        return Promise.resolve([[{ id: 12, status: 'open', recipient_user_id: 'guild:recipient', sender_user_id: 'guild:sender', amount: 4, note: 'gift' }], []]);
      }
      if (sql === 'INSERT IGNORE INTO coin_wallets (user_id) VALUES (?)') {
        return Promise.resolve([{}, []]);
      }
      if (sql.includes('FROM coin_wallets WHERE user_id = ? FOR UPDATE')) {
        const userId = (params as string[])[0];
        if (userId === 'sender' || userId === 'guild:sender') {
          return Promise.resolve([[{ user_id: 'sender', available_balance: 5, locked_balance: 4 }], []]);
        }
        return Promise.resolve([[{ user_id: 'recipient', available_balance: 1, locked_balance: 0 }], []]);
      }
      return Promise.resolve([{}, []]);
    });

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    await acceptExchangeOffer({ recipientUserId: 'recipient', offerId: 12, serverId: 'guild' });

    expect(execute).toHaveBeenCalledWith(
      'UPDATE coin_wallets SET locked_balance = ? WHERE user_id = ?',
      [0, 'guild:sender']
    );
    expect(execute).toHaveBeenCalledWith(
      'UPDATE coin_wallets SET available_balance = ? WHERE user_id = ?',
      [5, 'guild:recipient']
    );
    expect(commit).toHaveBeenCalledTimes(1);
    expect(rollback).not.toHaveBeenCalled();
    expect(logOperation).toHaveBeenCalledWith({
      userId: 'recipient',
      serverId: 'guild',
      action: 'coin_exchange_offer_accept',
      details: 'Accepted offer 12',
    });
  });

  test('acceptExchangeOffer uses fallback note when offer note is null', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('FROM coin_exchange_offers WHERE id = ? FOR UPDATE')) {
        return Promise.resolve([[{ id: 13, status: 'open', recipient_user_id: 'guild:recipient', sender_user_id: 'guild:sender', amount: 2, note: null }], []]);
      }
      if (sql === 'INSERT IGNORE INTO coin_wallets (user_id) VALUES (?)') return Promise.resolve([{}, []]);
      if (sql.includes('FROM coin_wallets WHERE user_id = ? FOR UPDATE')) {
        const userId = (params as string[])[0];
        if (userId === 'sender' || userId === 'guild:sender') return Promise.resolve([[{ user_id: 'sender', available_balance: 5, locked_balance: 2 }], []]);
        return Promise.resolve([[{ user_id: 'recipient', available_balance: 0, locked_balance: 0 }], []]);
      }
      return Promise.resolve([{}, []]);
    });

    (getDbConnection as jest.Mock).mockResolvedValue({ beginTransaction, execute, rollback, commit, end });

    await acceptExchangeOffer({ recipientUserId: 'recipient', offerId: 13, serverId: 'guild' });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO coin_exchange_transactions'),
      expect.arrayContaining(['guild:recipient', 'guild:sender', 'credit', 'offer_accept', 2, 2, 13, 'Offer accepted'])
    );
  });

  test('cancelExchangeOffer rejects when offer is not open', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ id: 20, status: 'cancelled', sender_user_id: 'owner', recipient_user_id: 'r', amount: 2 }], []]);

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    await expect(
      cancelExchangeOffer({ requesterUserId: 'owner', offerId: 20, serverId: 'guild' })
    ).rejects.toThrow('That offer is not open anymore.');

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
  });

  test('cancelExchangeOffer completes success path and writes audit log', async () => {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);

    const execute = jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('FROM coin_exchange_offers WHERE id = ? FOR UPDATE')) {
        return Promise.resolve([[{ id: 21, status: 'open', sender_user_id: 'owner', recipient_user_id: 'r', amount: 2 }], []]);
      }
      if (sql === 'INSERT IGNORE INTO coin_wallets (user_id) VALUES (?)') {
        return Promise.resolve([{}, []]);
      }
      if (sql.includes('FROM coin_wallets WHERE user_id = ? FOR UPDATE')) {
        return Promise.resolve([[{ user_id: 'owner', available_balance: 1.5, locked_balance: 2 }], []]);
      }
      return Promise.resolve([{}, []]);
    });

    (getDbConnection as jest.Mock).mockResolvedValue({
      beginTransaction,
      execute,
      rollback,
      commit,
      end,
    });

    await cancelExchangeOffer({ requesterUserId: 'owner', offerId: 21, serverId: 'guild' });

    expect(execute).toHaveBeenCalledWith(
      'UPDATE coin_wallets SET available_balance = ?, locked_balance = ? WHERE user_id = ?',
      [3.5, 0, 'owner']
    );
    expect(commit).toHaveBeenCalledTimes(1);
    expect(rollback).not.toHaveBeenCalled();
    expect(logOperation).toHaveBeenCalledWith({
      userId: 'owner',
      serverId: 'guild',
      action: 'coin_exchange_offer_cancel',
      details: 'Cancelled offer 21',
    });
  });

  test('listUserTransactions uses default limit when omitted', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ id: 30, user_id: 'u1', counterparty_user_id: null, direction: 'credit', kind: 'grant', amount: 1, balance_after: 2, offer_id: null, details: null, created_at: 't' }], []]);
    const end = jest.fn().mockResolvedValue(undefined);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute, end });

    const txs = await listUserTransactions('u1');

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('FROM coin_exchange_transactions'),
      ['u1', 10]
    );
    expect(txs[0]).toEqual(expect.objectContaining({ id: 30, kind: 'grant', userId: 'u1' }));
    expect(end).toHaveBeenCalledTimes(1);
  });

  test('listCoinWallets, listCoinOffers, and listCoinTransactions use defaults when omitted', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ user_id: 'u1', available_balance: 1, locked_balance: 0 }], []])
      .mockResolvedValueOnce([[{ id: 41, sender_user_id: 'a', recipient_user_id: 'b', amount: 1, status: 'open', note: null, created_at: 't', updated_at: 't', accepted_at: null, cancelled_at: null }], []])
      .mockResolvedValueOnce([[{ id: 42, user_id: 'a', counterparty_user_id: null, direction: 'credit', kind: 'grant', amount: 1, balance_after: 1, offer_id: null, details: null, created_at: 't' }], []]);
    const end = jest.fn().mockResolvedValue(undefined);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute, end });

    await listCoinWallets();
    await listCoinOffers();
    await listCoinTransactions();

    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM coin_wallets'),
      [50]
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      'SELECT * FROM coin_exchange_offers ORDER BY created_at DESC LIMIT ?',
      [50]
    );
    expect(execute).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('FROM coin_exchange_transactions'),
      [100]
    );
    expect(end).toHaveBeenCalledTimes(3);
  });
});
