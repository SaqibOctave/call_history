import multer from 'multer';
import env from '../config/env.mjs';
import { SUPPORTED_FILE_MIMETYPES } from '../services/knowledgeBase/fileExtractor.mjs';

// memoryStorage keeps the upload as an in-memory Buffer (req.file.buffer) instead of
// writing it to disk — fine for the small KB documents (PDF/CSV) this endpoint
// expects, and avoids having to clean up temp files afterward.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!SUPPORTED_FILE_MIMETYPES.includes(file.mimetype)) {
    // Passing an Error here makes multer abort the upload and forward the error to
    // Express's error-handling middleware instead of silently accepting the file.
    return cb(new Error(`Unsupported file type "${file.mimetype}". Supported: ${SUPPORTED_FILE_MIMETYPES.join(', ')}`));
  }
  cb(null, true);
}

// Only relevant when the request is multipart/form-data (a real file upload) — for
// a plain application/json request (the knowledgeBase.type === 'url' case) multer
// sees a non-multipart content-type and just calls next() without touching req.body,
// so both request shapes can hit the same POST /api/agents route.
export const uploadKnowledgeBaseFile = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.knowledgeBase.maxFileSizeBytes }, // KB_MAX_FILE_SIZE_BYTES (.env), 25MB default
}).single('file');
