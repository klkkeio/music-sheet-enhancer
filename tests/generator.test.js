const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { generateWorkbookHtml, generateSinglePageHtml } = require('../src/generator');

const exercises = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'note-exercises.json'), 'utf8')
);

test('generator: generateWorkbookHtml produces valid worksheet HTML', () => {
  const html = generateWorkbookHtml({
    exercises,
    locale: 'zh-TW',
    isAnswerKey: false,
    standalone: false
  });

  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('五線譜認音練習'));
  assert.ok(html.includes('練習卷'));
  assert.ok(html.includes('id="page1"'));
  assert.ok(html.includes('id="page4"'));
  assert.ok(html.includes('stave-1-1'));
  assert.ok(html.includes('stave-7-2'));
});

test('generator: generateWorkbookHtml produces valid answer key HTML', () => {
  const html = generateWorkbookHtml({
    exercises,
    locale: 'en',
    isAnswerKey: true,
    standalone: false
  });

  assert.ok(html.includes('Answer Key'));
  assert.ok(html.includes('ans-letter'));
  assert.ok(html.includes('ans-solfege'));
});

test('generator: generateSinglePageHtml produces single page layout', () => {
  const html = generateSinglePageHtml({
    exercises,
    locale: 'zh-CN',
    isAnswerKey: false,
    standalone: false
  });

  assert.ok(html.includes('五线谱认音练习 (单页完整版)'));
  assert.ok(html.includes('stave-1'));
  assert.ok(html.includes('stave-7'));
});
