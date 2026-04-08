"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradeRoutes = tradeRoutes;
const index_1 = require("../db/index");
const uuid_1 = require("uuid");
const trade_1 = require("../validation/trade");
const auditLog = __importStar(require("../../audit-log"));
// Use TypeScript wrapper for audit-log
// import * as auditLog from '../../audit-log';
// import { logOperation } from '../../audit-log';
// ...existing code...
const anomaly_detection_1 = require("../security/anomaly-detection");
const sanitize_1 = require("../security/sanitize");
async function tradeRoutes(fastify) {
    fastify.post("/api/trade/accept", async (req, reply) => {
        let body = req.body;
        body = (0, sanitize_1.sanitizeObject)(body);
        const { error } = (0, trade_1.validateTradeAcceptInput)(body);
        if (error)
            return reply.status(400).send({ error: error.message });
        const { offerId, buyerId } = body;
        const tradeId = (0, uuid_1.v4)();
        const selectQuery = "SELECT * FROM offers WHERE id=?";
        (0, anomaly_detection_1.detectAnomaly)(selectQuery, [offerId], { userId: buyerId, ip: req.ip });
        const [rows] = await (0, index_1.getDbPool)().execute(selectQuery, [offerId]);
        const offer = rows[0];
        const fee = offer.btc_amount * 0.005;
        const insertQuery = "INSERT INTO trades (id, offer_id, buyer_id, seller_id, btc_locked, fee, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
        const insertParams = [
            tradeId,
            offerId,
            buyerId,
            offer.user_id,
            offer.btc_amount,
            fee,
            "FUNDED",
        ];
        (0, anomaly_detection_1.detectAnomaly)(insertQuery, insertParams, { userId: buyerId, ip: req.ip });
        await (0, index_1.getDbPool)().execute(insertQuery, insertParams);
        const updateOfferQuery = 'UPDATE offers SET status="ACCEPTED" WHERE id=?';
        (0, anomaly_detection_1.detectAnomaly)(updateOfferQuery, [offerId], { userId: buyerId, ip: req.ip });
        await (0, index_1.getDbPool)().execute(updateOfferQuery, [offerId]);
        auditLog.logOperation({
            userId: buyerId,
            serverId: "",
            action: "trade_accept",
            details: `offerId=${offerId}, sellerId=${offer.user_id}, btcLocked=${offer.btc_amount}, fee=${fee}, tradeId=${tradeId}, ip=${req.ip}, timestamp=${new Date().toISOString()}`,
        });
        return { tradeId };
    });
    fastify.post("/api/trade/confirm", async (req, reply) => {
        let body = req.body;
        body = (0, sanitize_1.sanitizeObject)(body);
        const { error } = (0, trade_1.validateTradeConfirmInput)(body);
        if (error)
            return reply.status(400).send({ error: error.message });
        const { tradeId } = body;
        const updateTradeQuery = 'UPDATE trades SET status="COMPLETED" WHERE id=?';
        (0, anomaly_detection_1.detectAnomaly)(updateTradeQuery, [tradeId], { ip: req.ip });
        await (0, index_1.getDbPool)().execute(updateTradeQuery, [tradeId]);
        auditLog.logOperation({
            userId: "",
            serverId: "",
            action: "trade_confirm",
            details: `tradeId=${tradeId}, ip=${req.ip}, timestamp=${new Date().toISOString()}`,
        });
        return { success: true };
    });
}
