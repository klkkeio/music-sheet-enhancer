/**
 * index.js - Music Sheet Enhancer Public API
 */

const { generateWorkbookHtml, generateSinglePageHtml } = require('./generator');
const { createTranslator, resolveLocale, registerLocale, loadLocaleFromFile, getAvailableLocales } = require('./i18n');
const { validateExercises, escapeHtml } = require('./validator');
const { renderHtmlToPdf, findBrowserExecutable } = require('./pdf-renderer');

module.exports = {
  // Generation
  generateWorkbookHtml,
  generateSinglePageHtml,

  // PDF Rendering
  renderHtmlToPdf,
  findBrowserExecutable,

  // i18n
  createTranslator,
  resolveLocale,
  registerLocale,
  loadLocaleFromFile,
  getAvailableLocales,

  // Validation & Security
  validateExercises,
  escapeHtml
};
