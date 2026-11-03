export function notFoundHandler(_request, response) {
  response.status(404).json({
    success: false,
    message: 'Requested resource not found',
  });
}

export function errorHandler(error, _request, response, next) {
  console.error('Application error:', error);

  if (response.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  response.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Internal server error' : error.message,
  });
}
