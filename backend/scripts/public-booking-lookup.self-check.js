const assert = require('node:assert/strict');
const { normalizeIndonesianPhone, formatBookingCode, parseBookingCode } = require('../lib/publicBookingLookup');
assert.equal(normalizeIndonesianPhone('+62 812-3456-7890'), '081234567890');
assert.equal(normalizeIndonesianPhone('812 3456 7890'), '081234567890');
assert.equal(normalizeIndonesianPhone('021 1234'), null);
assert.equal(formatBookingCode(42), 'BKG-000042');
assert.equal(parseBookingCode('bkg-000042'), 42);
assert.equal(parseBookingCode('ABC-42'), null);
console.log('public booking lookup self-check: OK');