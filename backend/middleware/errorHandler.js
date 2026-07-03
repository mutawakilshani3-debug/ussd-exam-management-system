/* Centralized error handler. Any thrown error or next(err) call lands here. */
function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error.';

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'A record with these details already exists.';
  }

  // MySQL FK constraint
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'This action violates a related record constraint.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

module.exports = { notFound, errorHandler };
