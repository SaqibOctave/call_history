import { PDFParse } from 'pdf-parse';
import { parse as parseCsv } from 'csv-parse/sync';
import env from '../../config/env.mjs';
import AppError from '../../utils/AppError.mjs';
import logger from '../../config/logger.mjs';

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } catch (err) {
    // Wrap so a corrupt/encrypted PDF surfaces as a client error (400), not a raw
    // parser exception mapped to 500 by the default error handler.
    throw new AppError(`Could not read PDF: ${err.message}`, 400);
  } finally {
    // Releases the PDF worker/resources pdf-parse holds open internally.
    await parser.destroy();
  }
}

// CSV has no natural prose to scrape — instead, render each row as a "column: value"
// line so it reads like a sentence an embedding model can match against (e.g. a row
// {name: "Return Policy", answer: "30 days"} becomes "name: Return Policy\nanswer: 30
// days"), rather than embedding raw comma-separated values.
function extractCsvText(buffer) {
  let records;
  try {
    records = parseCsv(buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    // e.g. a stray unquoted comma throwing off the column count — a malformed CSV
    // is a client error (400), not a server error (500).
    throw new AppError(`Could not parse CSV: ${err.message}`, 400);
  }

  return records
    .map((row) =>
      Object.entries(row)
        .map(([column, value]) => `${column}: ${value}`)
        .join('\n')
    )
    .join('\n\n');
}

// Every file type this service knows how to read, keyed by mimetype. Adding support
// for a new type means writing an extractor here AND adding its mimetype to
// KB_ALLOWED_FILE_TYPES (.env) — one without the other does nothing.
const EXTRACTORS = {
  'application/pdf': (buffer) => extractPdfText(buffer),
  'text/csv': (buffer) => extractCsvText(buffer),
};

// Mimetypes actually accepted for knowledgeBase.type === 'file' uploads: the
// KB_ALLOWED_FILE_TYPES env var (src/config/env.mjs) intersected with the types
// EXTRACTORS above actually knows how to read — an env var can only turn an
// implemented type on/off, not invent support for a new one. Read once at import
// time, so changing .env requires restarting the app to take effect. Both the
// multer fileFilter (uploadKnowledgeBaseFile.mjs) and extractFileText() below import
// this same constant, so they can never disagree about what's supported.
export const SUPPORTED_FILE_MIMETYPES = env.knowledgeBase.allowedFileTypes.filter((type) => {
  const implemented = Object.prototype.hasOwnProperty.call(EXTRACTORS, type);
  if (!implemented) {
    logger.warn(`KB_ALLOWED_FILE_TYPES lists "${type}", but no extractor is implemented for it — ignoring.`);
  }
  return implemented;
});

// file: multer's in-memory file object — { buffer, mimetype, originalname, size }.
// Returns the plain text to hand to the same chunker/embedder used for scraped pages.
export async function extractFileText(file) {
  if (!SUPPORTED_FILE_MIMETYPES.includes(file.mimetype)) {
    throw new AppError(
      `Unsupported file type "${file.mimetype}". Supported: ${SUPPORTED_FILE_MIMETYPES.join(', ')}`,
      400
    );
  }
  return EXTRACTORS[file.mimetype](file.buffer);
}
