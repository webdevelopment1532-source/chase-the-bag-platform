import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

// Example route
app.get("/api", (req, res) => {
  res.json({ ok: true, service: "chase-the-bag", timestamp: new Date().toISOString() });
});

// Add more routes and middleware as needed

export default app;
