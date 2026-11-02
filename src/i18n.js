/**
 * i18n.js - Extensible Multi-lingual Engine for Music Sheet Enhancer
 * Supports BCP 47 culture codes, fallback hierarchies, and custom dictionaries.
 */

const fs = require('fs');
const path = require('path');

const BUILTIN_LOCALES_DIR = path.resolve(__dirname, '..', 'locales');
const registeredLocales = new Map();

/**
 * Load built-in locales on startup
 */
function loadBuiltinLocales() {
  const builtinFiles = [
    { code: 'en', file: 'en.json' },
    { code: 'zh-CN', file: 'zh-CN.json' },
    { code: 'zh-HK', file: 'zh-HK.json' },
    { code: 'zh-TW', file: 'zh-TW.json' }
  ];

  for (const { code, file } of builtinFiles) {
    const fullPath = path.join(BUILTIN_LOCALES_DIR, file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        registeredLocales.set(code, content);
      } catch (err) {
        console.error(`Failed to load built-in locale ${code}:`, err.message);
      }
    }
  }
}

loadBuiltinLocales();

/**
 * Register or override a locale dictionary in-memory
 * @param {string} code - BCP 47 or culture code (e.g. 'ja', 'es', 'zh-SG')
 * @param {object} dictionary - Translation dictionary
 */
function registerLocale(code, dictionary) {
  if (!code || typeof code !== 'string') {
    throw new TypeError('Locale code must be a non-empty string');
  }
  if (!dictionary || typeof dictionary !== 'object') {
    throw new TypeError('Dictionary must be a valid object');
  }
  registeredLocales.set(normalizeLocaleCode(code), dictionary);
}

/**
 * Load and register a locale from a JSON file
 * @param {string} filePath - Absolute or relative file path
 * @param {string} [customCode] - Optional override code
 * @returns {string} The registered locale code
 */
function loadLocaleFromFile(filePath, customCode) {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Locale file not found: ${resolvedPath}`);
  }
  const content = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  const code = customCode || (content.meta && content.meta.locale) || path.basename(filePath, '.json');
  registerLocale(code, content);
  return normalizeLocaleCode(code);
}

/**
 * Normalize culture/locale codes (e.g. "zh_tw" -> "zh-TW", "EN_us" -> "en-US")
 * @param {string} code
 * @returns {string}
 */
function normalizeLocaleCode(code) {
  if (!code || typeof code !== 'string') return 'en';
  const parts = code.trim().replace(/_/g, '-').split('-');
  if (parts.length === 1) {
    return parts[0].toLowerCase();
  }
  // e.g. zh-CN, zh-TW, en-US, zh-Hant-HK
  const lang = parts[0].toLowerCase();
  const rest = parts.slice(1).map(p => {
    if (p.length === 4) {
      // Script subtag (e.g. Hans, Hant)
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    }
    // Region subtag (e.g. CN, TW, HK, US, GB, AU)
    return p.toUpperCase();
  });
  return [lang, ...rest].join('-');
}

/**
 * Resolve input culture/language code to the best available registered locale
 * Handles BCP 47 subtags, scripts, regional aliases, and fallback to 'en'.
 * @param {string} inputCode
 * @returns {string} The matched registered locale code
 */
function resolveLocale(inputCode) {
  if (!inputCode) return 'en';
  const normalized = normalizeLocaleCode(inputCode);

  // 1. Exact match
  if (registeredLocales.has(normalized)) {
    return normalized;
  }

  // Case-insensitive exact match
  for (const registered of registeredLocales.keys()) {
    if (registered.toLowerCase() === normalized.toLowerCase()) {
      return registered;
    }
  }

  // 2. Specific Chinese script / region mappings
  const lower = normalized.toLowerCase();
  if (lower.startsWith('zh')) {
    if (lower.includes('hant')) {
      if (lower.includes('hk') || lower.includes('mo')) {
        return registeredLocales.has('zh-HK') ? 'zh-HK' : 'zh-TW';
      }
      return registeredLocales.has('zh-TW') ? 'zh-TW' : 'zh-HK';
    }
    if (lower.includes('hans') || lower.includes('cn') || lower.includes('sg')) {
      return registeredLocales.has('zh-CN') ? 'zh-CN' : 'en';
    }
    if (lower.includes('hk') || lower.includes('mo')) {
      return registeredLocales.has('zh-HK') ? 'zh-HK' : 'zh-TW';
    }
    if (lower.includes('tw')) {
      return registeredLocales.has('zh-TW') ? 'zh-TW' : 'zh-HK';
    }
    // Plain 'zh'
    return registeredLocales.has('zh-CN') ? 'zh-CN' : 'zh-TW';
  }

  // 3. Language base subtag fallback (e.g. 'en-US', 'en-AU', 'en-GB' -> 'en')
  const baseLang = normalized.split('-')[0].toLowerCase();
  if (registeredLocales.has(baseLang)) {
    return baseLang;
  }

  // 4. Default fallback
  return 'en';
}

/**
 * Helper to get a nested value from an object by dot-path
 * @param {object} obj
 * @param {string} keyPath
 * @returns {any}
 */
function getNestedValue(obj, keyPath) {
  if (!obj || typeof obj !== 'object') return undefined;
  const segments = keyPath.split('.');
  let current = obj;
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[seg];
  }
  return current;
}

/**
 * Replace {param} placeholders in template string
 * @param {string} template
 * @param {object} [params]
 * @returns {string}
 */
function interpolate(template, params) {
  if (typeof template !== 'string') return '';
  if (!params || typeof params !== 'object') return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in params ? String(params[key]) : match;
  });
}

/**
 * Create a translation function for a given culture/locale
 * Falls back safely to 'en' dictionary for any missing keys.
 * @param {string} [inputLocale]
 * @param {object} [customOverrides]
 * @returns {Function & { locale: string, raw: Function, dict: object }}
 */
function createTranslator(inputLocale = 'en', customOverrides = null) {
  const resolvedCode = resolveLocale(inputLocale);
  const primaryDict = registeredLocales.get(resolvedCode) || {};
  const fallbackDict = registeredLocales.get('en') || {};

  function t(keyPath, params = null) {
    // 1. Check custom overrides
    let val = getNestedValue(customOverrides, keyPath);
    // 2. Check primary resolved locale
    if (val === undefined) {
      val = getNestedValue(primaryDict, keyPath);
    }
    // 3. Fallback to English
    if (val === undefined) {
      val = getNestedValue(fallbackDict, keyPath);
    }
    // 4. If still missing, return the keyPath
    if (val === undefined) {
      return keyPath;
    }

    if (typeof val === 'string') {
      return interpolate(val, params);
    }
    return val;
  }

  t.locale = resolvedCode;
  t.dict = primaryDict;
  t.raw = function(keyPath) {
    return getNestedValue(customOverrides, keyPath) ??
           getNestedValue(primaryDict, keyPath) ??
           getNestedValue(fallbackDict, keyPath);
  };

  return t;
}

/**
 * Get list of all currently registered locale codes
 * @returns {string[]}
 */
function getAvailableLocales() {
  return Array.from(registeredLocales.keys());
}

module.exports = {
  createTranslator,
  resolveLocale,
  normalizeLocaleCode,
  registerLocale,
  loadLocaleFromFile,
  getAvailableLocales,
  interpolate
};
