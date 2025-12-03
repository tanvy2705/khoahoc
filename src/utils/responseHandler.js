class ResponseHandler {
  // Success response
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  // Error response
  static error(res, message = 'Error', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  }

  // Created response
  static created(res, data = null, message = 'Created successfully') {
    return this.success(res, data, message, 201);
  }

  // Bad request
  static badRequest(res, message = 'Bad request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  // Unauthorized
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  // Forbidden
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  // Not found
  static notFound(res, message = 'Not found') {
    return this.error(res, message, 404);
  }

  // Conflict
  static conflict(res, message = 'Conflict', errors = null) {
    return this.error(res, message, 409, errors);
  }

  // Internal server error
  static internalError(res, message = 'Internal server error') {
    return this.error(res, message, 500);
  }

  // Paginated response
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        total_pages: Math.ceil(pagination.total / pagination.limit)
      }
    });
  }
}

module.exports = ResponseHandler;