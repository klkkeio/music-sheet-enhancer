const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { parseArgs } = require('../bin/cli');

test('cli: parseArgs parses defaults correctly', () => {
  const opts = parseArgs([]);
  assert.equal(opts.format, 'all');
  assert.equal(opts.lang, 'en');
  assert.equal(opts.pdf, false);
  assert.equal(opts.html, true);
  assert.equal(opts.standalone, true);
});

test('cli: parseArgs handles custom flags', () => {
  const args = [
    '--format', 'workbook',
    '--lang', 'zh-HK',
    '--out', './custom-dist',
    '--pdf',
    '--no-html'
  ];
  const opts = parseArgs(args);
  assert.equal(opts.format, 'workbook');
  assert.equal(opts.lang, 'zh-HK');
  assert.ok(opts.out.endsWith('custom-dist'));
  assert.equal(opts.pdf, true);
  assert.equal(opts.html, false);
});
