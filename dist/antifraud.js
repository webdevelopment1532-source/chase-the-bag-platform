"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFraudulentActivity = checkFraudulentActivity;
// Anti-fraud and compliance monitoring
const db_1 = require("./db");
async function checkFraudulentActivity(userId) {
    const db = await (0, db_1.getDbConnection)();
    const alerts = [];
    // Example: Too many referrals in a short time
    const [refRows] = await db.execute(`SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'send_affiliate_link' AND created_at > NOW() - INTERVAL 1 HOUR`, [userId]);
    if (refRows[0]?.count > 5) {
        alerts.push('High referral activity detected (possible abuse)');
    }
    // Example: Too many codes generated
    const [codeRows] = await db.execute(`SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'generate_self_code' AND created_at > NOW() - INTERVAL 1 HOUR`, [userId]);
    if (codeRows[0]?.count > 10) {
        alerts.push('Excessive code generation detected');
    }
    return alerts;
}
