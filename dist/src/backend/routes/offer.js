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
exports.offerRoutes = offerRoutes;
const index_1 = require("../db/index");
const uuid_1 = require("uuid");
const offer_1 = require("../validation/offer");
const auditLog = __importStar(require("../../audit-log"));
// Use TypeScript wrapper for audit-log
// import * as auditLog from '../../audit-log';
// import { logOperation } from '../../audit-log';
// ...existing code...
const anomaly_detection_1 = require("../security/anomaly-detection");
const sanitize_1 = require("../security/sanitize");
async function offerRoutes(fastify) {
    fastify.post("/api/offer", async (req, reply) => {
        let body = req.body;
        body = (0, sanitize_1.sanitizeObject)(body);
        const { error } = (0, offer_1.validateOfferInput)(body);
        if (error)
            return reply.status(400).send({ error: error.message });
        const { userId, btcAmount, usdAmount } = body;
        const id = (0, uuid_1.v4)();
        const query = "INSERT INTO offers (id, user_id, type, btc_amount, usd_amount, status) VALUES (?, ?, ?, ?, ?, ?)";
        const params = [id, userId, "SELL", btcAmount, usdAmount, "CREATED"];
        (0, anomaly_detection_1.detectAnomaly)(query, params, { userId, ip: req.ip });
        await (0, index_1.getDbPool)().execute(query, params);
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
        (0, anomaly_detection_1.detectAnomaly)(query, [], { ip: _req.ip });
        let rows = [];
        try {
            const dbResult = await (0, index_1.getDbPool)().execute(query);
            rows = Array.isArray(dbResult[0]) ? dbResult[0] : [];
        }
        catch (e) {
            console.error("[DEBUG] /api/offers DB error:", e);
            rows = [];
        }
        // DEBUG: Log rows
        console.error("[DEBUG] /api/offers rows:", rows);
        // Always return an array
        return Array.isArray(rows) ? rows : [];
    });
}
