export default function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.isOperational) {
    return res.status(err.statusCode).json({ status: 'error', message: err.message });
  }

  // googleapis errors expose an HTTP-like `code`; pass it through when sensible.
  if (typeof err.code === 'number' && err.code >= 400 && err.code < 600) {
    const message = err.errors?.[0]?.message || err.message || 'Google Calendar API error';
    return res.status(err.code).json({ status: 'error', message });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
}
