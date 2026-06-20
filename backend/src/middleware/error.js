export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({
    message: err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  });
}

export class AppError extends Error {
  constructor(message, status = 400, details) {
    super(message);
    this.status = status;
    if (details) this.details = details;
  }
}
