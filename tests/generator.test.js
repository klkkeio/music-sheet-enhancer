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

test('generator: handles arbitrary exercise count with dynamic pagination', () => {
  const custom3 = [
    {
      id: 1,
      clef: 'treble',
      title: 'Custom Treble Practice',
      notes: [{ key: 'c/4', letter: 'C' }, { key: 'd/4', letter: 'D' }]
    },
    {
      id: 2,
      clef: 'bass',
      title: 'Custom Bass Practice',
      notes: [{ key: 'a/2', letter: 'A' }, { key: 'c/3', letter: 'C' }]
    },
    {
      id: 3,
      clef: 'treble',
      title: 'Custom Grand Finale',
      notes: [{ key: 'g/4', letter: 'G' }]
    }
  ];

  const html = generateWorkbookHtml({
    exercises: custom3,
    locale: 'en',
    isAnswerKey: false,
    standalone: false
  });

  // 3 exercises -> 2 pages
  assert.ok(html.includes('id="page1"'));
  assert.ok(html.includes('id="page2"'));
  assert.ok(!html.includes('id="page3"'));
  assert.ok(html.includes('Custom Treble Practice'));
  assert.ok(html.includes('Custom Grand Finale'));
  assert.ok(html.includes('Page 1 of 2'));
  assert.ok(html.includes('Page 2 of 2'));
});
