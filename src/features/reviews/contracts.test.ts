import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReviewError, parseReviewResult, reviewInput, reviewMean } from './contracts';
test('six ratings preserve dimensions, reject invalid input, and allow optional text', () => {
  const value = {
    listing: 'test-listing',
    body: '',
    revision: '0',
    score0: '1',
    score1: '2',
    score2: '3',
    score3: '4',
    score4: '5',
    score5: '3',
  };
  assert.deepEqual(reviewInput(value).scores, [1, 2, 3, 4, 5, 3]);
  assert.equal(reviewMean([1, 2, 3, 4, 5, 3]), 3);
  for (const score0 of ['0', '6', 'NaN', '1.5', ''])
    assert.throws(() => reviewInput({ ...value, score0 }));
  assert.throws(() => reviewInput({ ...value, body: 'x'.repeat(2001) }));
  assert.throws(() => reviewInput({ ...value, revision: '-1' }));
});

test('review result and error codes accept only fixed values', () => {
  assert.equal(parseReviewResult('saved'), 'saved');
  assert.equal(parseReviewResult('reported'), 'reported');
  assert.equal(parseReviewResult('other'), undefined);
  assert.equal(parseReviewError('write_failed'), 'write_failed');
  assert.equal(parseReviewError('report_failed'), 'report_failed');
  assert.equal(parseReviewError('other'), undefined);
});
