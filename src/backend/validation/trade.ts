import Joi from 'joi';

export const tradeAcceptSchema = Joi.object({
  offerId: Joi.string().min(1).required(),
  buyerId: Joi.string().min(1).required(),
});

export const tradeConfirmSchema = Joi.object({
  tradeId: Joi.string().min(1).required(),
});

export function validateTradeAcceptInput(input: any) {
  return tradeAcceptSchema.validate(input);
}

export function validateTradeConfirmInput(input: any) {
  return tradeConfirmSchema.validate(input);
}
