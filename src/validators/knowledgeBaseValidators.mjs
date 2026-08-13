import Joi from 'joi';

// Same knowledgeBase shape as agentValidators.mjs, but as a standalone resource:
// no `config` here — that's an agent-level concept (STT/LLM/TTS provider settings),
// not something a knowledge base itself has.
export const createKnowledgeBaseSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  knowledgeBase: Joi.object({
    type: Joi.string().valid('url', 'file').required(),

    url: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .when('type', { is: 'url', then: Joi.required(), otherwise: Joi.forbidden() }),

    fileName: Joi.string()
      .when('type', { is: 'file', then: Joi.required(), otherwise: Joi.forbidden() }),
    fileType: Joi.string()
      .when('type', { is: 'file', then: Joi.required(), otherwise: Joi.forbidden() }),
    fileSize: Joi.number().integer().positive()
      .when('type', { is: 'file', then: Joi.required(), otherwise: Joi.forbidden() }),
  }).required(),
});
