import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { validate, to13, to10 } from '../src/server.js';

// Known valid ISBNs:
//   ISBN-10: 0-306-40615-2  (Knuth — checksum=2)
//   ISBN-13: 978-3-16-148410-0
//   ISBN-13: 9780306406157

test('validate ISBN-10 valid', () => {
  const r = validate('0306406152');
  assert.equal(r.valid, true);
  assert.equal(r.type, 'isbn-10');
});

test('validate ISBN-10 with dashes', () => {
  const r = validate('0-306-40615-2');
  assert.equal(r.valid, true);
});

test('validate ISBN-10 with X check digit', () => {
  // 0-306-40615-X is not real; use a constructed example.
  // 9 digits then X: pick 9 digits such that mod 11 = 10.
  // For "123456789": (1*1 + 2*2 + 3*3 + ... + 9*9) = 285; 285 % 11 = 10 → X
  const r = validate('123456789X');
  assert.equal(r.valid, true);
});

test('validate ISBN-13 valid', () => {
  const r = validate('9783161484100');
  assert.equal(r.valid, true);
  assert.equal(r.type, 'isbn-13');
});

test('rejects bad checksum', () => {
  const r = validate('0306406153');
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'checksum failed');
});

test('rejects wrong length', () => {
  assert.equal(validate('12345').valid, false);
});

test('to_13 converts ISBN-10', () => {
  const out = to13('0306406152');
  assert.equal(out, '9780306406157');
});

test('to_10 converts ISBN-13', () => {
  const out = to10('9780306406157');
  assert.equal(out, '0306406152');
});

test('to_10 errors for 979 prefix', () => {
  // 9790000000001 is not a valid checksum but construct one:
  // For 979000000000: even-indexed (0-indexed) digits = 9,9,0,0,0,0; odd = 7,0,0,0,0,0
  // sum = 9+27+0+0+0+0+0+0+0+0+0+0 = 36 (wait: digits at idx 0,2,4,6,8,10 are 9,9,0,0,0,0; idx 1,3,5,7,9,11 are 7,0,0,0,0,0)
  // sum = (9+9+0+0+0+0) + (7+0+0+0+0+0)*3 = 18+21 = 39; check = (10-9)%10 = 1
  assert.throws(() => to10('9790000000001'));
});

test('round trip', () => {
  const orig = '0306406152';
  assert.equal(to10(to13(orig)), orig);
});
