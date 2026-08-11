import Joi from 'joi';

export const scrapeRequestSchema = Joi.object({
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  provider: Joi.string().valid('playwright', 'fetch', 'firecrawl').optional(),
});
