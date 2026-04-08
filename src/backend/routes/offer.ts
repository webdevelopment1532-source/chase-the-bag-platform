import { FastifyInstance } from "fastify";
import { getDbPool } from "../db/index";
import { v4 as uuidv4 } from "uuid";
import { validateOfferInput } from "../validation/offer";
import * as auditLog from "../../audit-log";
// Use TypeScript wrapper for audit-log
// import * as auditLog from '../../audit-log';
// import { logOperation } from '../../audit-log';
// ...existing code...
import { detectAnomaly } from "../security/anomaly-detection";
import { sanitizeObject } from "../security/sanitize";

export async function offerRoutes(fastify: FastifyInstance) {
  fastify.post("/api/offer", async (req, reply) => {
    let body = req.body as any;
    body = sanitizeObject(body);
    const { error } = validateOfferInput(body);
    if (error) return reply.status(400).send({ error: error.message });
    const { userId, btcAmount, usdAmount } = body;
    const id = uuidv4();
    const query =
      "INSERT INTO offers (id, user_id, type, btc_amount, usd_amount, status) VALUES (?, ?, ?, ?, ?, ?)";
    const params = [id, userId, "SELL", btcAmount, usdAmount, "CREATED"];
    detectAnomaly(query, params, { userId, ip: req.ip });
    await getDbPool().execute(query, params);
    auditLog.logOperation({
      userId,
      serverId: "",
      action: "offer_create",
      details: `btcAmount=${btcAmount}, usdAmount=${usdAmount}, offerId=${id}, ip=${req.ip}, timestamp=${new Date().toISOString()}`,
    });
    return { id };
  });

  fastify.get("/api/offers", async (_req, reply) => {
    // DEBUG: Log handler entry

    console.error("[DEBUG] /api/offers handler called");
    const query = 'SELECT * FROM offers WHERE status="CREATED"';
    detectAnomaly(query, [], { ip: _req.ip });
    let rows: any = [];
    try {
      const dbResult = await getDbPool().execute(query);
      rows = Array.isArray(dbResult[0]) ? dbResult[0] : [];
    } catch (e) {
      console.error("[DEBUG] /api/offers DB error:", e);
      rows = [];
    }
    // DEBUG: Log rows

    console.error("[DEBUG] /api/offers rows:", rows);
    // Always return an array
    return Array.isArray(rows) ? rows : [];
  });
}
