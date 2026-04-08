"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExchangeOffer = createExchangeOffer;
exports.acceptExchangeOffer = acceptExchangeOffer;
exports.cancelExchangeOffer = cancelExchangeOffer;
exports.listUserOffers = listUserOffers;
const audit_log_1 = require("../audit-log");
const db_1 = require("../models/db");
const offer_validation_1 = require("../validation/offer.validation");
async function createExchangeOffer(opts) {
    (0, offer_validation_1.validateCreateOfferInput)(opts);
    const { senderUserId, recipientUserId, amount } = opts;
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        // Insert offer
        const [result] = await conn.execute(`INSERT INTO offers (sender_user_id, recipient_user_id, amount, status, created_at) VALUES (?, ?, ?, 'OPEN', NOW())`, [senderUserId, recipientUserId, amount]);
        const offerId = result.insertId;
        // Audit log
        (0, audit_log_1.logOperation)({
            userId: senderUserId,
            serverId: "",
            action: "offer_create",
            details: `recipientUserId=${recipientUserId}, amount=${amount}, offerId=${offerId}`,
        });
        await conn.commit();
        return offerId;
    }
    catch (err) {
        await conn.rollback();
        let errorMsg = "Unknown error";
        if (err instanceof Error)
            errorMsg = err.message;
        (0, audit_log_1.logOperation)({
            userId: senderUserId,
            serverId: "",
            action: "offer_create_error",
            details: `recipientUserId=${recipientUserId}, amount=${amount}, error=${errorMsg}`,
        });
        throw err;
    }
    finally {
        conn.release();
    }
}
async function acceptExchangeOffer(opts) {
    (0, offer_validation_1.validateAcceptOfferInput)(opts);
    const { offerId, userId } = opts;
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        // Lock and update offer
        const [offers] = await conn.execute(`SELECT * FROM offers WHERE id = ? FOR UPDATE`, [offerId]);
        if (!offers[0] || offers[0].status !== "OPEN") {
            throw new Error("Offer not available");
        }
        await conn.execute(`UPDATE offers SET status = 'ACCEPTED', accepted_by = ?, accepted_at = NOW() WHERE id = ?`, [userId, offerId]);
        (0, audit_log_1.logOperation)({
            userId,
            serverId: "",
            action: "offer_accept",
            details: `offerId=${offerId}`,
        });
        await conn.commit();
        return { offerId, status: "ACCEPTED" };
    }
    catch (err) {
        await conn.rollback();
        let errorMsg = "Unknown error";
        if (err instanceof Error)
            errorMsg = err.message;
        (0, audit_log_1.logOperation)({
            userId,
            serverId: "",
            action: "offer_accept_error",
            details: `offerId=${offerId}, error=${errorMsg}`,
        });
        throw err;
    }
    finally {
        conn.release();
    }
}
async function cancelExchangeOffer(opts) {
    (0, offer_validation_1.validateCancelOfferInput)(opts);
    const { offerId, userId } = opts;
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        // Lock and update offer
        const [offers] = await conn.execute(`SELECT * FROM offers WHERE id = ? FOR UPDATE`, [offerId]);
        if (!offers[0] || offers[0].status !== "OPEN") {
            throw new Error("Offer not available");
        }
        await conn.execute(`UPDATE offers SET status = 'CANCELLED', cancelled_by = ?, cancelled_at = NOW() WHERE id = ?`, [userId, offerId]);
        (0, audit_log_1.logOperation)({
            userId,
            serverId: "",
            action: "offer_cancel",
            details: `offerId=${offerId}`,
        });
        await conn.commit();
        return { offerId, status: "CANCELLED" };
    }
    catch (err) {
        await conn.rollback();
        let errorMsg = "Unknown error";
        if (err instanceof Error)
            errorMsg = err.message;
        (0, audit_log_1.logOperation)({
            userId,
            serverId: "",
            action: "offer_cancel_error",
            details: `offerId=${offerId}, error=${errorMsg}`,
        });
        throw err;
    }
    finally {
        conn.release();
    }
}
async function listUserOffers(userId) {
    // Only return offers where user is sender or recipient
    const conn = await db_1.pool.getConnection();
    try {
        const [rows] = await conn.execute(`SELECT id, sender_user_id, recipient_user_id, amount, status, created_at, accepted_at, cancelled_at FROM offers WHERE sender_user_id = ? OR recipient_user_id = ? ORDER BY created_at DESC`, [userId, userId]);
        return rows;
    }
    catch (err) {
        let errorMsg = "Unknown error";
        if (err instanceof Error)
            errorMsg = err.message;
        (0, audit_log_1.logOperation)({
            userId,
            serverId: "",
            action: "list_offers_error",
            details: `error=${errorMsg}`,
        });
        throw err;
    }
    finally {
        conn.release();
    }
}
