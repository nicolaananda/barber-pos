export function moneyToNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === 'object') {
        const maybeDecimal = value as { toString?: () => string };
        if (typeof maybeDecimal.toString === 'function') {
            const parsed = Number(maybeDecimal.toString());
            return Number.isFinite(parsed) ? parsed : 0;
        }
    }
    return 0;
}
