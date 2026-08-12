import Joi from 'joi';

// `config` holds arbitrary STT/LLM/TTS provider settings (provider-specific keys),
// so its inner keys are intentionally left unrestricted (.unknown(true)) — only the
// envelope shape (name, config, knowledgeBase) is validated here.
export const createAgentSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  config: Joi.object().unknown(true).default({}),
  knowledgeBase: Joi.object({
    type: Joi.string().valid('url').required(),
    url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  }).optional(),
});
