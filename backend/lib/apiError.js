class ApiError extends Error {
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

const badRequest = (message, details) => new ApiError(400, 'VALIDATION_ERROR', message, details);

function sendError(res, error, fallbackMessage = 'Internal server error') {
    const status = error.status || error.statusCode || 500;
    const payload = {
        error: status >= 500 && process.env.NODE_ENV === 'production' ? fallbackMessage : error.message,
        code: error.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR')
    };

    if (error.details) payload.details = error.details;
    return res.status(status).json(payload);
}

module.exports = { ApiError, badRequest, sendError };
