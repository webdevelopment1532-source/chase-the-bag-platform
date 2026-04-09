import { FastifyInstance } from "fastify";
import { getDbPool } from "../db/index";
import { v4 as uuidv4 } from "uuid";
import { validateOfferInput } from "../validation/offer";
import { logOperation } from "../../audit-log";
import { detectAnomaly } from "../security/anomaly-detection";
import { sanitizeObject } from "../security/sanitize";

export async function offerRoutes(fastify: FastifyInstance) {
  // Create a new offer
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
    logOperation({
      userId,
      serverId: "",
      action: "offer_create",
      details: `Created offer. btcAmount=${btcAmount}, usdAmount=${usdAmount}, offerId=${id}, ip=${req.ip}, timestamp=${new Date().toISOString()}`,
    });
    return reply.send({ id });
  });

  // List all created offers
  fastify.get("/api/offers", async (_req) => {
    const query = 'SELECT * FROM offers WHERE status="CREATED"';
    detectAnomaly(query, [], { ip: _req.ip });
    try {
      const dbResult = await getDbPool().execute(query);
      const rows = Array.isArray(dbResult[0]) ? dbResult[0] : [];
      return rows;
    } catch {
      return [];
    }
  });
}
