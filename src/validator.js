/**
 * validator.js - Schema validation & security sanitization for exercises
 */

const NOTE_KEY_REGEX = /^[a-gA-G][b#]?\/[0-8]$/;
const VALID_CLEFS = new Set(['treble', 'bass']);

/**
 * Escape HTML special characters to prevent XSS injection
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate and sanitize an exercise dataset
 * @param {any} data - Raw exercises data
 * @returns {{ valid: boolean, errors: string[], sanitized: Array }}
 */
function validateExercises(data) {
  const errors = [];

  if (!Array.isArray(data)) {
    return {
      valid: false,
      errors: ['Input exercises data must be an array'],
      sanitized: []
    };
  }

  if (data.length === 0) {
    return {
      valid: false,
      errors: ['Exercises array must contain at least one exercise'],
      sanitized: []
    };
  }

  const sanitized = [];

  data.forEach((ex, exIdx) => {
    const prefix = `Exercise [${exIdx}]`;

    if (!ex || typeof ex !== 'object') {
      errors.push(`${prefix}: Must be an object`);
      return;
    }

    const id = Number(ex.id) || (exIdx + 1);
    const clef = String(ex.clef || '').toLowerCase().trim();

    if (!VALID_CLEFS.has(clef)) {
      errors.push(`${prefix} (id: ${id}): Invalid clef "${ex.clef}". Must be "treble" or "bass".`);
    }

    if (!Array.isArray(ex.notes) || ex.notes.length === 0) {
      errors.push(`${prefix} (id: ${id}): Notes must be a non-empty array.`);
      return;
    }

    const sanitizedNotes = [];
    ex.notes.forEach((note, noteIdx) => {
      const notePrefix = `${prefix} Note [${noteIdx}]`;
      if (!note || typeof note !== 'object') {
        errors.push(`${notePrefix}: Must be an object`);
        return;
      }

      const key = String(note.key || '').toLowerCase().trim();
      if (!NOTE_KEY_REGEX.test(key)) {
        errors.push(`${notePrefix}: Invalid note key "${note.key}". Must follow VexFlow format (e.g. "c/4", "e/5", "bb/3").`);
      }

      const letter = escapeHtml(String(note.letter || '').trim().toUpperCase());
      const solfege = note.solfege ? escapeHtml(String(note.solfege).trim().toLowerCase()) : '';

      sanitizedNotes.push({
        key,
        letter: letter || key.split('/')[0].toUpperCase(),
        solfege
      });
    });

    sanitized.push({
      id,
      clef,
      category: ex.category ? escapeHtml(String(ex.category).trim()) : 'mixed',
      title: ex.title ? escapeHtml(String(ex.title).trim()) : undefined,
      subtitle: ex.subtitle ? escapeHtml(String(ex.subtitle).trim()) : undefined,
      notes: sanitizedNotes
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

module.exports = {
  validateExercises,
  escapeHtml,
  NOTE_KEY_REGEX,
  VALID_CLEFS
};
