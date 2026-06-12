export function moneyToNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === 'object') {
        const maybeDecimal = value as { toString?: () => string };
        const maybeDecimalParts = value as { d?: number[]; e?: number; s?: number };
        if (Array.isArray(maybeDecimalParts.d) && typeof maybeDecimalParts.e === 'number' && typeof maybeDecimalParts.s === 'number') {
            const digits = maybeDecimalParts.d.join('');
            const sign = maybeDecimalParts.s < 0 ? '-' : '';
            const exponent = maybeDecimalParts.e;
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
        if (typeof maybeDecimal.toString === 'function') {
            const parsed = Number(maybeDecimal.toString());
            return Number.isFinite(parsed) ? parsed : 0;
        }
    }
    return 0;
}
