import Joi from 'joi';

// `config` holds arbitrary STT/LLM/TTS provider settings (provider-specific keys),
// so its inner keys are intentionally left unrestricted (.unknown(true)) — only the
// envelope shape (name, config, knowledgeBase) is validated here.
//
// knowledgeBase.type drives which fields are required, via Joi's .when():
//   'url'  -> requires `url`, forbids the file.* fields
//   'file' -> requires fileName/fileType/fileSize (the actual bytes travel as
//             multer's req.file, not through JSON/Joi — agent.routes.mjs normalizes
//             a multipart upload into this same shape before validation runs)
export const createAgentSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  config: Joi.object().unknown(true).default({}),
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
  }).optional(),
});
