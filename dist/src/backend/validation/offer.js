"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOfferInput = validateOfferInput;
const joi_1 = __importDefault(require("joi"));
const offerSchema = joi_1.default.object({
    userId: joi_1.default.string()
        .min(1)
        .max(64)
        .pattern(/^[a-zA-Z0-9_\-]+$/)
        .required()
        .messages({
        'string.pattern.base': 'userId contains invalid characters',
    }),
    btcAmount: joi_1.default.number().positive().required(),
    usdAmount: joi_1.default.number().positive().required(),
});
function validateOfferInput(input) {
    return offerSchema.validate(input);
}
