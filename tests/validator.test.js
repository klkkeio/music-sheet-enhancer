const test = require('node:test');
const assert = require('node:assert/strict');
const { validateExercises, escapeHtml } = require('../src/validator');

test('validator: escapeHtml prevents XSS injection', () => {
  assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml("Tom & Jerry's"), 'Tom &amp; Jerry&#039;s');
});

test('validator: validates valid exercises data', () => {
  const sample = [
    {
      id: 1,
      clef: 'treble',
      category: 'lines',
      notes: [
        { key: 'e/4', letter: 'E', solfege: 'mi' },
        { key: 'g/4', letter: 'G', solfege: 'sol' }
      ]
    }
  ];

  const result = validateExercises(sample);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.sanitized.length, 1);
  assert.equal(result.sanitized[0].notes.length, 2);
});

test('validator: catches invalid clef, malformed keys, and empty arrays', () => {
  // Not an array
  assert.equal(validateExercises(null).valid, false);
  assert.equal(validateExercises([]).valid, false);

  // Invalid clef
  const invalidClef = [{ id: 1, clef: 'alto', notes: [{ key: 'c/4', letter: 'C' }] }];
  const res1 = validateExercises(invalidClef);
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.some(e => e.includes('Invalid clef')));

  // Invalid note key format
  const invalidKey = [{ id: 1, clef: 'treble', notes: [{ key: 'bad_note_format', letter: 'X' }] }];
  const res2 = validateExercises(invalidKey);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some(e => e.includes('Invalid note key')));
});
