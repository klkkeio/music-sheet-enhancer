const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { generateWorkbookHtml } = require('../src/generator');
const { escapeHtml, validateExercises } = require('../src/validator');

test('security: escapeHtml neutralizes script injection and tags', () => {
  const maliciousInput = '<img src=x onerror=alert(1)>"\'';
  const escaped = escapeHtml(maliciousInput);
  assert.ok(!escaped.includes('<img'));
  assert.ok(!escaped.includes('>'));
  assert.ok(escaped.startsWith('&lt;img'));
  assert.ok(escaped.includes('&quot;'));
  assert.ok(escaped.includes('&#039;'));
});

test('security: generator safely escapes malicious exercise data in templates', () => {
  const maliciousExercises = [
    {
      id: 1,
      clef: 'treble',
      title: '<script>alert("pwned")</script>',
      notes: [
        { key: 'c/4', letter: '<script>hack()</script>', solfege: 'do' }
      ]
    }
  ];

  const html = generateWorkbookHtml({
    exercises: maliciousExercises,
    locale: 'en',
    standalone: false
  });

  // Verify raw script tag does not appear
  assert.ok(!html.includes('<script>alert("pwned")</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;'));
});

test('security: no sensitive tokens or environment secrets committed in repo', () => {
  const sensitivePatterns = [
    /ghp_[a-zA-Z0-9]{36}/,
    /github_pat_[a-zA-Z0-9_]{22,}/,
    /AKIA[0-9A-Z]{16}/,
    /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/
  ];

  const filesToCheck = [
    'package.json',
    'src/index.js',
    'src/generator.js',
    'src/i18n.js',
    'src/pdf-renderer.js',
    'src/validator.js',
    'bin/cli.js'
  ];

  for (const relPath of filesToCheck) {
    const fullPath = path.resolve(__dirname, '..', relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of sensitivePatterns) {
        assert.equal(pattern.test(content), false, `Sensitive pattern match in ${relPath}`);
      }
    }
  }
});
