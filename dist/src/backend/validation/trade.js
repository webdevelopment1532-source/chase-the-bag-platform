"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradeConfirmSchema = exports.tradeAcceptSchema = void 0;
exports.validateTradeAcceptInput = validateTradeAcceptInput;
exports.validateTradeConfirmInput = validateTradeConfirmInput;
const joi_1 = __importDefault(require("joi"));
exports.tradeAcceptSchema = joi_1.default.object({
    offerId: joi_1.default.string().min(1).required(),
    buyerId: joi_1.default.string().min(1).required(),
});
exports.tradeConfirmSchema = joi_1.default.object({
    tradeId: joi_1.default.string().min(1).required(),
});
function validateTradeAcceptInput(input) {
    return exports.tradeAcceptSchema.validate(input);
}
function validateTradeConfirmInput(input) {
    return exports.tradeConfirmSchema.validate(input);
}
