/**
 * Global Error Handling Middleware.
 * Captures all unhandled controller errors and formats them into JSON responses.
 */
export const errorHandler = (err, req, res, next) => {
  console.error('[System Error]:', err.stack || err.message);

  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
