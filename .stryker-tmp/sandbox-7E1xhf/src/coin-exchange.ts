// @ts-nocheck
import { Connection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getDbConnection } from './db';
import { logOperation } from './audit-log';

type WalletRow = RowDataPacket & {
  user_id: string;
  available_balance: number | string;
  locked_balance: number | string;
};

type OfferRow = RowDataPacket & {
  id: number;
  sender_user_id: string;
  recipient_user_id: string;
  amount: number | string;
  status: 'open' | 'accepted' | 'cancelled';
  note: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
};

type TransactionRow = RowDataPacket & {
  id: number;
  user_id: string;
  counterparty_user_id: string | null;
  direction: 'credit' | 'debit';
  kind: 'grant' | 'transfer' | 'offer_lock' | 'offer_accept' | 'offer_cancel';
  amount: number | string;
  balance_after: number | string;
  offer_id: number | null;
  details: string | null;
  created_at: string;
};

export type CoinWallet = {
  userId: string;
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
};

export type CoinExchangeOffer = {
  id: number;
  senderUserId: string;
  recipientUserId: string;
  amount: number;
  status: 'open' | 'accepted' | 'cancelled';
  note: string | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  cancelledAt: string | null;
};

export type CoinExchangeTransaction = {
  id: number;
  userId: string;
  counterpartyUserId: string | null;
  direction: 'credit' | 'debit';
  kind: 'grant' | 'transfer' | 'offer_lock' | 'offer_accept' | 'offer_cancel';
  amount: number;
  balanceAfter: number;
  offerId: number | null;
  details: string | null;
  createdAt: string;
};

function toAmount(value: number | string) {
  return Number(Number(value).toFixed(2));
}

export function parseCoinAmount(input: string) {
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return null;
  return toAmount(value);
}

async function ensureWallet(connection: Connection, userId: string) {
  await connection.execute('INSERT IGNORE INTO coin_wallets (user_id) VALUES (?)', [userId]);
}

function mapWallet(row: WalletRow): CoinWallet {
  const availableBalance = toAmount(row.available_balance);
  const lockedBalance = toAmount(row.locked_balance);
  return {
    userId: row.user_id,
    availableBalance,
    lockedBalance,
    totalBalance: toAmount(availableBalance + lockedBalance),
  };
}

function mapOffer(row: OfferRow): CoinExchangeOffer {
  return {
    id: row.id,
    senderUserId: row.sender_user_id,
    recipientUserId: row.recipient_user_id,
    amount: toAmount(row.amount),
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    acceptedAt: row.accepted_at,
    cancelledAt: row.cancelled_at,
  };
}

function mapTransaction(row: TransactionRow): CoinExchangeTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    counterpartyUserId: row.counterparty_user_id,
    direction: row.direction,
    kind: row.kind,
    amount: toAmount(row.amount),
    balanceAfter: toAmount(row.balance_after),
    offerId: row.offer_id,
    details: row.details,
    createdAt: row.created_at,
  };
}

async function getLockedWallet(connection: Connection, userId: string) {
  await ensureWallet(connection, userId);
  const [rows] = await connection.execute<WalletRow[]>(
    'SELECT user_id, available_balance, locked_balance FROM coin_wallets WHERE user_id = ? FOR UPDATE',
    [userId]
  );
  return mapWallet(rows[0]);
}

async function insertTransaction(
  connection: Connection,
  userId: string,
  counterpartyUserId: string | null,
  direction: CoinExchangeTransaction['direction'],
  kind: CoinExchangeTransaction['kind'],
  amount: number,
  balanceAfter: number,
  offerId: number | null,
  details: string | null,
) {
  await connection.execute(
    `INSERT INTO coin_exchange_transactions
      (user_id, counterparty_user_id, direction, kind, amount, balance_after, offer_id, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, counterpartyUserId, direction, kind, amount, balanceAfter, offerId, details]
  );
}

export async function getCoinWallet(userId: string) {
  const db = await getDbConnection();
  try {
    await ensureWallet(db, userId);
    const [rows] = await db.execute<WalletRow[]>(
      'SELECT user_id, available_balance, locked_balance FROM coin_wallets WHERE user_id = ?',
      [userId]
    );
    return mapWallet(rows[0]);
  } finally {
    await db.end();
  }
}

export async function grantCoins(params: { actorUserId: string; targetUserId: string; amount: number; serverId: string; details?: string }) {
  const db = await getDbConnection();
  try {
    await db.beginTransaction();
    const wallet = await getLockedWallet(db, params.targetUserId);
    const newAvailable = toAmount(wallet.availableBalance + params.amount);
    await db.execute('UPDATE coin_wallets SET available_balance = ? WHERE user_id = ?', [newAvailable, params.targetUserId]);
    await insertTransaction(db, params.targetUserId, params.actorUserId, 'credit', 'grant', params.amount, newAvailable, null, params.details ?? null);
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }

  await logOperation({
    userId: params.actorUserId,
    serverId: params.serverId,
    action: 'coin_exchange_grant',
    details: `Granted ${params.amount.toFixed(2)} coins to ${params.targetUserId}`,
  });

  return getCoinWallet(params.targetUserId);
}

export async function transferCoins(params: { fromUserId: string; toUserId: string; amount: number; serverId: string }) {
  if (params.fromUserId === params.toUserId) {
    throw new Error('You cannot transfer coins to yourself.');
  }

  const db = await getDbConnection();
  try {
    await db.beginTransaction();
    const senderWallet = await getLockedWallet(db, params.fromUserId);
    if (senderWallet.availableBalance < params.amount) {
      throw new Error('Insufficient available balance.');
    }

    const recipientWallet = await getLockedWallet(db, params.toUserId);
    const senderAvailable = toAmount(senderWallet.availableBalance - params.amount);
    const recipientAvailable = toAmount(recipientWallet.availableBalance + params.amount);

    await db.execute('UPDATE coin_wallets SET available_balance = ? WHERE user_id = ?', [senderAvailable, params.fromUserId]);
    await db.execute('UPDATE coin_wallets SET available_balance = ? WHERE user_id = ?', [recipientAvailable, params.toUserId]);

    await insertTransaction(db, params.fromUserId, params.toUserId, 'debit', 'transfer', params.amount, senderAvailable, null, 'Direct transfer');
    await insertTransaction(db, params.toUserId, params.fromUserId, 'credit', 'transfer', params.amount, recipientAvailable, null, 'Direct transfer');
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }

  await logOperation({
    userId: params.fromUserId,
    serverId: params.serverId,
    action: 'coin_exchange_transfer',
    details: `Transferred ${params.amount.toFixed(2)} coins to ${params.toUserId}`,
  });
}

export async function createExchangeOffer(params: {
  senderUserId: string;
  recipientUserId: string;
  amount: number;
  note?: string;
  serverId: string;
}) {
  if (params.senderUserId === params.recipientUserId) {
    throw new Error('You cannot create an offer to yourself.');
  }

  const db = await getDbConnection();
  let offerId = 0;
  try {
    await db.beginTransaction();
    const senderWallet = await getLockedWallet(db, params.senderUserId);
    await ensureWallet(db, params.recipientUserId);

    if (senderWallet.availableBalance < params.amount) {
      throw new Error('Insufficient available balance to create that offer.');
    }

    const newAvailable = toAmount(senderWallet.availableBalance - params.amount);
    const newLocked = toAmount(senderWallet.lockedBalance + params.amount);

    await db.execute(
      'UPDATE coin_wallets SET available_balance = ?, locked_balance = ? WHERE user_id = ?',
      [newAvailable, newLocked, params.senderUserId]
    );

    const [offerResult] = await db.execute<ResultSetHeader>(
      'INSERT INTO coin_exchange_offers (sender_user_id, recipient_user_id, amount, note) VALUES (?, ?, ?, ?)',
      [params.senderUserId, params.recipientUserId, params.amount, params.note ?? null]
    );
    offerId = offerResult.insertId;

    await insertTransaction(db, params.senderUserId, params.recipientUserId, 'debit', 'offer_lock', params.amount, newAvailable, offerId, params.note ?? 'Offer created');
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }

  await logOperation({
    userId: params.senderUserId,
    serverId: params.serverId,
    action: 'coin_exchange_offer_create',
    details: `Created offer ${offerId} for ${params.recipientUserId} amount ${params.amount.toFixed(2)}`,
  });

  return offerId;
}

export async function acceptExchangeOffer(params: { recipientUserId: string; offerId: number; serverId: string }) {
  const db = await getDbConnection();
  try {
    await db.beginTransaction();
    const [offerRows] = await db.execute<OfferRow[]>(
      'SELECT * FROM coin_exchange_offers WHERE id = ? FOR UPDATE',
      [params.offerId]
    );
    const offer = offerRows[0];

    if (!offer || offer.status !== 'open') {
      throw new Error('That offer is not open anymore.');
    }
    if (offer.recipient_user_id !== params.recipientUserId) {
      throw new Error('You are not the recipient for that offer.');
    }

    const senderWallet = await getLockedWallet(db, offer.sender_user_id);
    const recipientWallet = await getLockedWallet(db, offer.recipient_user_id);
    const amount = toAmount(offer.amount);

    if (senderWallet.lockedBalance < amount) {
      throw new Error('The sender no longer has enough locked balance for this offer.');
    }

    const senderLocked = toAmount(senderWallet.lockedBalance - amount);
    const recipientAvailable = toAmount(recipientWallet.availableBalance + amount);

    await db.execute('UPDATE coin_wallets SET locked_balance = ? WHERE user_id = ?', [senderLocked, offer.sender_user_id]);
    await db.execute('UPDATE coin_wallets SET available_balance = ? WHERE user_id = ?', [recipientAvailable, offer.recipient_user_id]);
    await db.execute(
      'UPDATE coin_exchange_offers SET status = \'accepted\', accepted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [params.offerId]
    );

    await insertTransaction(db, offer.sender_user_id, offer.recipient_user_id, 'debit', 'offer_accept', amount, senderWallet.availableBalance, params.offerId, 'Offer accepted');
    await insertTransaction(db, offer.recipient_user_id, offer.sender_user_id, 'credit', 'offer_accept', amount, recipientAvailable, params.offerId, offer.note ?? 'Offer accepted');
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }

  await logOperation({
    userId: params.recipientUserId,
    serverId: params.serverId,
    action: 'coin_exchange_offer_accept',
    details: `Accepted offer ${params.offerId}`,
  });
}

export async function cancelExchangeOffer(params: { requesterUserId: string; offerId: number; serverId: string }) {
  const db = await getDbConnection();
  try {
    await db.beginTransaction();
    const [offerRows] = await db.execute<OfferRow[]>(
      'SELECT * FROM coin_exchange_offers WHERE id = ? FOR UPDATE',
      [params.offerId]
    );
    const offer = offerRows[0];

    if (!offer || offer.status !== 'open') {
      throw new Error('That offer is not open anymore.');
    }
    if (offer.sender_user_id !== params.requesterUserId) {
      throw new Error('Only the sender can cancel that offer.');
    }

    const senderWallet = await getLockedWallet(db, offer.sender_user_id);
    const amount = toAmount(offer.amount);
    const senderAvailable = toAmount(senderWallet.availableBalance + amount);
    const senderLocked = toAmount(senderWallet.lockedBalance - amount);

    await db.execute(
      'UPDATE coin_wallets SET available_balance = ?, locked_balance = ? WHERE user_id = ?',
      [senderAvailable, senderLocked, offer.sender_user_id]
    );
    await db.execute(
      'UPDATE coin_exchange_offers SET status = \'cancelled\', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?',
      [params.offerId]
    );
    await insertTransaction(db, offer.sender_user_id, offer.recipient_user_id, 'credit', 'offer_cancel', amount, senderAvailable, params.offerId, 'Offer cancelled');
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }

  await logOperation({
    userId: params.requesterUserId,
    serverId: params.serverId,
    action: 'coin_exchange_offer_cancel',
    details: `Cancelled offer ${params.offerId}`,
  });
}

export async function listUserOffers(userId: string) {
  const db = await getDbConnection();
  try {
    const [rows] = await db.execute<OfferRow[]>(
      `SELECT *
       FROM coin_exchange_offers
       WHERE sender_user_id = ? OR recipient_user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId, userId]
    );
    return rows.map(mapOffer);
  } finally {
    await db.end();
  }
}

export async function listUserTransactions(userId: string, limit = 10) {
  const db = await getDbConnection();
  try {
    const [rows] = await db.execute<TransactionRow[]>(
      `SELECT id, user_id, counterparty_user_id, direction, kind, amount, balance_after, offer_id, details, created_at
       FROM coin_exchange_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    return rows.map(mapTransaction);
  } finally {
    await db.end();
  }
}

export async function getCoinExchangeOverview() {
  const db = await getDbConnection();
  try {
    const [[wallets]] = (await db.execute('SELECT COUNT(*) AS total FROM coin_wallets')) as RowDataPacket[][];
    const [[supply]] = (await db.execute('SELECT COALESCE(SUM(available_balance + locked_balance), 0) AS total FROM coin_wallets')) as RowDataPacket[][];
    const [[locked]] = (await db.execute('SELECT COALESCE(SUM(locked_balance), 0) AS total FROM coin_wallets')) as RowDataPacket[][];
    const [[offers]] = (await db.execute("SELECT COUNT(*) AS total FROM coin_exchange_offers WHERE status = 'open'")) as RowDataPacket[][];
    const [[transactions]] = (await db.execute('SELECT COUNT(*) AS total FROM coin_exchange_transactions')) as RowDataPacket[][];

    return {
      wallets: Number(wallets.total),
      totalSupply: toAmount(supply.total),
      lockedSupply: toAmount(locked.total),
      openOffers: Number(offers.total),
      transactions: Number(transactions.total),
    };
  } finally {
    await db.end();
  }
}

export async function listCoinWallets(limit = 50) {
  const db = await getDbConnection();
  try {
    const [rows] = await db.execute<WalletRow[]>(
      `SELECT user_id, available_balance, locked_balance
       FROM coin_wallets
       ORDER BY (available_balance + locked_balance) DESC, updated_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows.map(mapWallet);
  } finally {
    await db.end();
  }
}

export async function listCoinOffers(limit = 50, status = '') {
  const db = await getDbConnection();
  try {
    const [rows] = status
      ? await db.execute<OfferRow[]>(
          'SELECT * FROM coin_exchange_offers WHERE status = ? ORDER BY created_at DESC LIMIT ?',
          [status, limit]
        )
      : await db.execute<OfferRow[]>(
          'SELECT * FROM coin_exchange_offers ORDER BY created_at DESC LIMIT ?',
          [limit]
        );
    return rows.map(mapOffer);
  } finally {
    await db.end();
  }
}

export async function listCoinTransactions(limit = 100, userId = '') {
  const db = await getDbConnection();
  try {
    const [rows] = userId
      ? await db.execute<TransactionRow[]>(
          `SELECT id, user_id, counterparty_user_id, direction, kind, amount, balance_after, offer_id, details, created_at
           FROM coin_exchange_transactions
           WHERE user_id = ?
           ORDER BY created_at DESC
           LIMIT ?`,
          [userId, limit]
        )
      : await db.execute<TransactionRow[]>(
          `SELECT id, user_id, counterparty_user_id, direction, kind, amount, balance_after, offer_id, details, created_at
           FROM coin_exchange_transactions
           ORDER BY created_at DESC
           LIMIT ?`,
          [limit]
        );
    return rows.map(mapTransaction);
  } finally {
    await db.end();
  }
}