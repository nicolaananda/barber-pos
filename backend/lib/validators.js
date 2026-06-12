const { badRequest } = require('./apiError');

function requiredString(value, field, options = {}) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw badRequest(`${field} is required`);
    }

    const trimmed = value.trim();
    if (options.min && trimmed.length < options.min) throw badRequest(`${field} must be at least ${options.min} characters`);
    if (options.max && trimmed.length > options.max) throw badRequest(`${field} must be at most ${options.max} characters`);
    return trimmed;
}

function optionalString(value, field, options = {}) {
    if (value === undefined || value === null || value === '') return undefined;
    return requiredString(value, field, options);
}

function requiredInt(value, field, options = {}) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) throw badRequest(`${field} must be an integer`);
    if (options.min !== undefined && parsed < options.min) throw badRequest(`${field} must be at least ${options.min}`);
    if (options.max !== undefined && parsed > options.max) throw badRequest(`${field} must be at most ${options.max}`);
    return parsed;
}

function optionalInt(value, field, options = {}) {
    if (value === undefined || value === null || value === '') return undefined;
    return requiredInt(value, field, options);
}

function requiredMoney(value, field, options = {}) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw badRequest(`${field} must be a valid number`);
    if (options.min !== undefined && parsed < options.min) throw badRequest(`${field} must be at least ${options.min}`);
    if (options.max !== undefined && parsed > options.max) throw badRequest(`${field} must be at most ${options.max}`);
    return Number(parsed.toFixed(2));
}

function optionalMoney(value, field, options = {}) {
    if (value === undefined || value === null || value === '') return undefined;
    return requiredMoney(value, field, options);
}

function requiredEnum(value, field, values) {
    if (!values.includes(value)) throw badRequest(`${field} must be one of: ${values.join(', ')}`);
    return value;
}

function optionalEnum(value, field, values) {
    if (value === undefined || value === null || value === '') return undefined;
    return requiredEnum(value, field, values);
}

function optionalDate(value, field) {
    if (value === undefined || value === null || value === '') return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw badRequest(`${field} must be a valid date`);
    return date;
}

function requiredDate(value, field) {
    const date = optionalDate(value, field);
    if (!date) throw badRequest(`${field} is required`);
    return date;
}

function validate(schema) {
    return (req, res, next) => {
        try {
            const result = schema(req);
            req.validated = result || {};
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    requiredString,
    optionalString,
    requiredInt,
    optionalInt,
    requiredMoney,
    optionalMoney,
    requiredEnum,
    optionalEnum,
    requiredDate,
    optionalDate,
    validate
};
