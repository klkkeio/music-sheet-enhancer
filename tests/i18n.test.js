const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveLocale,
  normalizeLocaleCode,
  createTranslator,
  registerLocale,
  getAvailableLocales
} = require('../src/i18n');

test('i18n: normalizeLocaleCode', () => {
  assert.equal(normalizeLocaleCode('en'), 'en');
  assert.equal(normalizeLocaleCode('zh_tw'), 'zh-TW');
  assert.equal(normalizeLocaleCode('zh-hant-hk'), 'zh-Hant-HK');
  assert.equal(normalizeLocaleCode('EN-us'), 'en-US');
});

test('i18n: resolveLocale for built-in locales and aliases', () => {
  assert.equal(resolveLocale('en'), 'en');
  assert.equal(resolveLocale('en-US'), 'en');
  assert.equal(resolveLocale('en-AU'), 'en');
  assert.equal(resolveLocale('zh-CN'), 'zh-CN');
  assert.equal(resolveLocale('zh-TW'), 'zh-TW');
  assert.equal(resolveLocale('zh-HK'), 'zh-HK');
  assert.equal(resolveLocale('zh-Hant'), 'zh-TW');
  assert.equal(resolveLocale('zh-Hant-HK'), 'zh-HK');
  assert.equal(resolveLocale('zh-Hans'), 'zh-CN');
  assert.equal(resolveLocale('zh-MO'), 'zh-HK');
  assert.equal(resolveLocale('zh_TW'), 'zh-TW');
  // Unknown falls back to en
  assert.equal(resolveLocale('xyz-123'), 'en');
});

test('i18n: translator interpolates variables and falls back to en', () => {
  const tEn = createTranslator('en');
  assert.equal(tEn('common.pageOf', { page: 2, total: 4 }), 'Page 2 of 4');
  assert.ok(tEn('workbook.title').includes('Note Reading Exercise'));

  const tTW = createTranslator('zh-TW');
  assert.equal(tTW('common.pageOf', { page: 2, total: 4 }), '第 2 頁 / 共 4 頁');
  assert.ok(tTW('workbook.title').includes('五線譜認音練習'));

  const tHK = createTranslator('zh-HK');
  assert.equal(tHK('workbook.worksheetBadge'), '工作紙');
});

test('i18n: register custom locale and use it', () => {
  registerLocale('ja', {
    meta: { locale: 'ja', name: '日本語' },
    common: {
      studentName: '氏名：',
      date: '日付：',
      pageOf: '{page} / {total} ページ'
    },
    workbook: {
      title: '🎹 ピアノ譜読み練習 (キッズ版)'
    }
  });

  assert.ok(getAvailableLocales().includes('ja'));
  const tJa = createTranslator('ja');
  assert.equal(tJa('common.studentName'), '氏名：');
  assert.equal(tJa('common.pageOf', { page: 1, total: 4 }), '1 / 4 ページ');
  assert.equal(tJa('workbook.title'), '🎹 ピアノ譜読み練習 (キッズ版)');
  // Fallback to English for unprovided key
  assert.ok(tJa('workbook.tips.treble').includes('Treble Clef'));
});
