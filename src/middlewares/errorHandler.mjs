export default function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.isOperational) {
    return res.status(err.statusCode).json({ status: 'error', message: err.message });
  }

  // multer rejects bad uploads (wrong mimetype via fileFilter, oversized file) with
  // a plain Error / MulterError — neither is an AppError, but the message is exactly
  // what the caller needs to fix their request, so surface it as 400 instead of 500.
  if (err.name === 'MulterError' || /^Unsupported file type/.test(err.message || '')) {
    return res.status(400).json({ status: 'error', message: err.message });
  }

  // googleapis errors expose an HTTP-like `code`; pass it through when sensible.
  if (typeof err.code === 'number' && err.code >= 400 && err.code < 600) {
    const message = err.errors?.[0]?.message || err.message || 'Google Calendar API error';
    return res.status(err.code).json({ status: 'error', message });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
}
