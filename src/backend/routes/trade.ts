import { FastifyInstance } from "fastify";
import { getDbPool } from "../db/index";
import { v4 as uuidv4 } from "uuid";
import {
  validateTradeAcceptInput,
  validateTradeConfirmInput,
} from "../validation/trade";
import * as auditLog from "../../audit-log";
// Use TypeScript wrapper for audit-log
// import * as auditLog from '../../audit-log';
// import { logOperation } from '../../audit-log';
// ...existing code...
import { detectAnomaly } from "../security/anomaly-detection";
import { sanitizeObject } from "../security/sanitize";

export async function tradeRoutes(fastify: FastifyInstance) {
  fastify.post("/api/trade/accept", async (req, reply) => {
    let body = req.body as any;
    body = sanitizeObject(body);
    const { error } = validateTradeAcceptInput(body);
    if (error) return reply.status(400).send({ error: error.message });
    const { offerId, buyerId } = body;
    const tradeId = uuidv4();
    const selectQuery = "SELECT * FROM offers WHERE id=?";
    detectAnomaly(selectQuery, [offerId], { userId: buyerId, ip: req.ip });
    const [rows]: any = await getDbPool().execute(selectQuery, [offerId]);
    const offer = rows[0];
    const fee = offer.btc_amount * 0.005;
    const insertQuery =
      "INSERT INTO trades (id, offer_id, buyer_id, seller_id, btc_locked, fee, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const insertParams = [
      tradeId,
      offerId,
      buyerId,
      offer.user_id,
      offer.btc_amount,
      fee,
      "FUNDED",
    ];
    detectAnomaly(insertQuery, insertParams, { userId: buyerId, ip: req.ip });
    await getDbPool().execute(insertQuery, insertParams);
    const updateOfferQuery = 'UPDATE offers SET status="ACCEPTED" WHERE id=?';
    detectAnomaly(updateOfferQuery, [offerId], { userId: buyerId, ip: req.ip });
    await getDbPool().execute(updateOfferQuery, [offerId]);
    auditLog.logOperation({
      userId: buyerId,
      serverId: "",
      action: "trade_accept",
      details: `offerId=${offerId}, sellerId=${offer.user_id}, btcLocked=${offer.btc_amount}, fee=${fee}, tradeId=${tradeId}, ip=${req.ip}, timestamp=${new Date().toISOString()}`,
    });
    return { tradeId };
  });

  fastify.post("/api/trade/confirm", async (req, reply) => {
    let body = req.body as any;
    body = sanitizeObject(body);
    const { error } = validateTradeConfirmInput(body);
    if (error) return reply.status(400).send({ error: error.message });
    const { tradeId } = body;
    const updateTradeQuery = 'UPDATE trades SET status="COMPLETED" WHERE id=?';
    detectAnomaly(updateTradeQuery, [tradeId], { ip: req.ip });
    await getDbPool().execute(updateTradeQuery, [tradeId]);
    auditLog.logOperation({
      userId: "",
      serverId: "",
      action: "trade_confirm",
      details: `tradeId=${tradeId}, ip=${req.ip}, timestamp=${new Date().toISOString()}`,
    });
    return { success: true };
  });
}
