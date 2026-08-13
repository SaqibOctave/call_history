import { Router } from 'express';
import * as controller from '../controllers/knowledgeBase.controller.mjs';
import { validateBody } from '../middlewares/validate.mjs';
import { uploadKnowledgeBaseFile } from '../middlewares/uploadKnowledgeBaseFile.mjs';
import { createKnowledgeBaseSchema } from '../validators/knowledgeBaseValidators.mjs';

const router = Router();

// multer (uploadKnowledgeBaseFile) parses multipart/form-data into req.file + string
// fields in req.body; for a plain JSON request it's a no-op. Either way req.body
// only has plain string/number fields afterward — there's no `knowledgeBase` object
// yet for a file upload (form fields can't nest objects). This reshapes both request
// forms into the one shape createKnowledgeBaseSchema/the controller expect:
// { name, knowledgeBase }. Same pattern as agent.routes.mjs's normalizeAgentPayload.
function normalizeKnowledgeBasePayload(req, res, next) {
  if (!req.file) return next(); // JSON request (knowledgeBase.type === 'url') — already in shape

  req.body.knowledgeBase = {
    type: 'file',
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
  };

  next();
}

router.get('/',       controller.listKnowledgeBases);
router.get('/:id',    controller.getKnowledgeBaseById);
router.delete('/:id', controller.deleteKnowledgeBase);
router.post(
  '/',
  uploadKnowledgeBaseFile,
  normalizeKnowledgeBasePayload,
  validateBody(createKnowledgeBaseSchema),
  controller.createKnowledgeBase
);

export default router;
