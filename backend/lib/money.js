function isDecimalLike(value) {
    return value && typeof value === 'object' && value.constructor?.name === 'Decimal' && typeof value.toString === 'function';
}

function toNumber(value) {
    if (value === null || value === undefined) return 0;
    if (isDecimalLike(value)) return Number(value.toString());
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function serializeMoney(value) {
    if (isDecimalLike(value)) return toNumber(value);
    if (Array.isArray(value)) return value.map(serializeMoney);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializeMoney(entry)]));
    }
    return value;
}

module.exports = { serializeMoney, toNumber };
