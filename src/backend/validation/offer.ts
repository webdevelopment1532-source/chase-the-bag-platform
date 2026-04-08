import Joi from 'joi';


const offerSchema = Joi.object({
  userId: Joi.string()
    .min(1)
    .max(64)
    .pattern(/^[a-zA-Z0-9_\-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'userId contains invalid characters',
    }),
  btcAmount: Joi.number().positive().required(),
  usdAmount: Joi.number().positive().required(),
});

export function validateOfferInput(input: any) {
  return offerSchema.validate(input);
}
