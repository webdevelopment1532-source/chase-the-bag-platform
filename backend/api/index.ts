import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { logOperation } from "../../src/audit-log";
import {
  createExchangeOffer,
  acceptExchangeOffer,
  cancelExchangeOffer,
  listUserOffers,
} from "../../src/services/offer.service";
import { pool } from "../../src/models/db";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

// Health check
app.get("/api", (req, res) => {
  res.json({
    ok: true,
    service: "chase-the-bag",
    timestamp: new Date().toISOString(),
  });
});

// Offer routes
app.post("/api/offer", async (req, res) => {
  try {
    const offerId = await createExchangeOffer(req.body);
    res.json({ offerId });
  } catch (err) {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/offer/accept", async (req, res) => {
  try {
    const result = await acceptExchangeOffer(req.body);
    res.json(result);
  } catch (err) {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/offer/cancel", async (req, res) => {
  try {
    const result = await cancelExchangeOffer(req.body);
    res.json(result);
  } catch (err) {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/offers/:userId", async (req, res) => {
  try {
    const offers = await listUserOffers(req.params.userId);
    res.json(offers);
  } catch (err) {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// DB connection test endpoint
app.get("/api/db-test", async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    res.json({ db: "ok" });
  } catch (err) {
    res
      .status(500)
      .json({
        db: "error",
        error: err instanceof Error ? err.message : String(err),
      });
  }
});

export default app;
