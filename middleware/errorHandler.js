const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message    = err.message    || 'Internal Server Error';

  if (err.code === 11000) {
    const field    = Object.keys(err.keyValue)[0];
    err.message    = `${field} already exists`;
    err.statusCode = 400;
  }

  if (err.name === 'ValidationError') {
    err.message    = Object.values(err.errors).map(e => e.message).join(', ');
    err.statusCode = 400;
  }

  if (err.name === 'JsonWebTokenError') {
    err.message    = 'Invalid token';
    err.statusCode = 401;
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

module.exports = errorHandler;