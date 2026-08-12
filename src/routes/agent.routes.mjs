
import { Router } from 'express';
import * as controller from '../controllers/agent.controller.mjs';
import { validateBody } from '../middlewares/validate.mjs';
import { uploadKnowledgeBaseFile } from '../middlewares/uploadKnowledgeBaseFile.mjs';
import { createAgentSchema } from '../validators/agentValidators.mjs';
import AppError from '../utils/AppError.mjs';

const router = Router();

// multer parses multipart/form-data into req.file + string fields in req.body; for a
// plain JSON request it's a no-op (see uploadKnowledgeBaseFile.mjs). Either way, by
// the time this runs req.body only has plain string/number fields — `config` arrives
// as a JSON string over multipart (form fields can't nest objects), and there's no
// `knowledgeBase` object at all yet. This reshapes both request forms into the one
// shape createAgentSchema/the controller expect: { name, config: {...}, knowledgeBase }.
function normalizeAgentPayload(req, res, next) {
  if (!req.file) return next(); // JSON request — req.body is already in the right shape

  if (typeof req.body.config === 'string') {
    try {
      req.body.config = JSON.parse(req.body.config);
    } catch {
      return next(new AppError('config must be valid JSON when uploading a file', 400));
    }
  }

  req.body.knowledgeBase = {
    type: 'file',
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
  };

  next();
}

router.get('/',       controller.getAllAgents);
router.get('/:id',    controller.getAgentById);
router.post(
  '/',
  uploadKnowledgeBaseFile,
  normalizeAgentPayload,
  validateBody(createAgentSchema),
  controller.createAgent
);

export default router;
