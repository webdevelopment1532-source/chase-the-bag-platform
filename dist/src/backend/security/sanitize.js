"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeString = sanitizeString;
exports.sanitizeNumber = sanitizeNumber;
exports.sanitizeObject = sanitizeObject;
// Centralized input sanitization for all user input
// Prevents XSS, SQLi, and injection attacks
const xss_1 = __importDefault(require("xss"));
function sanitizeString(str) {
    return (0, xss_1.default)(str.trim());
}
function sanitizeNumber(n) {
    const num = Number(n);
    if (isNaN(num))
        throw new Error('Invalid number input');
    return num;
}
function sanitizeObject(obj) {
    const sanitized = {};
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            // Try to convert to number if possible
            const num = Number(obj[key]);
            if (!isNaN(num) && obj[key].trim() !== '') {
                sanitized[key] = sanitizeNumber(obj[key]);
            }
            else {
                sanitized[key] = sanitizeString(obj[key]);
            }
        }
        else if (typeof obj[key] === 'number') {
            sanitized[key] = sanitizeNumber(obj[key]);
        }
        else {
            sanitized[key] = obj[key];
        }
    }
    return sanitized;
}
