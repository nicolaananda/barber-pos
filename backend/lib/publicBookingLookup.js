const normalizeIndonesianPhone = (value) => {
    if (typeof value !== 'string') return null;
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('0062')) digits = digits.slice(2);
    if (digits.startsWith('62')) digits = `0${digits.slice(2)}`;
    else if (digits.startsWith('8')) digits = `0${digits}`;
    return /^08\d{8,11}$/.test(digits) ? digits : null;
};
const formatBookingCode = (id) => `BKG-${String(id).padStart(6, '0')}`;
const parseBookingCode = (value) => {
    const match = typeof value === 'string' ? value.trim().toUpperCase().match(/^(?:BKG[- ]?)?(\d{1,10})$/) : null;
    const id = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};
module.exports = { normalizeIndonesianPhone, formatBookingCode, parseBookingCode };