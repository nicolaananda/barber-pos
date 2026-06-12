function isDecimalLike(value) {
    return value && typeof value === 'object' && value.constructor?.name === 'Decimal' && typeof value.toString === 'function';
}

function toNumber(value) {
    if (value === null || value === undefined) return 0;
    if (isDecimalLike(value)) return Number(value.toString());
    if (typeof value === 'object' && Array.isArray(value.d) && typeof value.e === 'number' && typeof value.s === 'number') {
        const digits = value.d.join('');
        const sign = value.s < 0 ? '-' : '';
        const exponent = value.e;
        const decimalPos = exponent + 1;
        let numericString;

        if (decimalPos <= 0) {
            numericString = `0.${'0'.repeat(Math.abs(decimalPos))}${digits}`;
        } else if (decimalPos >= digits.length) {
            numericString = `${digits}${'0'.repeat(decimalPos - digits.length)}`;
        } else {
            numericString = `${digits.slice(0, decimalPos)}.${digits.slice(decimalPos)}`;
        }

        const parsed = Number(`${sign}${numericString}`);
        return Number.isFinite(parsed) ? parsed : 0;
    }
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
