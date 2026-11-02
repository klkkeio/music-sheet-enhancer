/**
 * pdf-renderer.js - Cross-Platform Headless Browser PDF Compiler
 * Locates Edge, Chrome, or Chromium and renders HTML directly to PDF.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

/**
 * Find available browser executable
 * @returns {string|null}
 */
function findBrowserExecutable() {
  if (process.env.BROWSER_PATH && fs.existsSync(process.env.BROWSER_PATH)) {
    return process.env.BROWSER_PATH;
  }

  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  if (isWindows) {
    const candidates = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) return p;
    }

    // Try `where msedge` or `where chrome`
    try {
      const res = execSync('where msedge', { stdio: 'pipe' }).toString().trim().split('\r\n')[0];
      if (res && fs.existsSync(res)) return res;
    } catch (_) {}

    try {
      const res = execSync('where chrome', { stdio: 'pipe' }).toString().trim().split('\r\n')[0];
      if (res && fs.existsSync(res)) return res;
    } catch (_) {}
  } else if (isMac) {
    const candidates = [
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  } else {
    // Linux
    const candidates = ['google-chrome', 'google-chrome-stable', 'chromium-browser', 'chromium', 'microsoft-edge'];
    for (const cmd of candidates) {
      try {
        const res = execSync(`which ${cmd}`, { stdio: 'pipe' }).toString().trim();
        if (res) return res;
      } catch (_) {}
    }
  }

  return null;
}

/**
 * Render HTML file to PDF
 * @param {string} htmlFilePath - Path to source HTML file
 * @param {string} pdfOutputPath - Target PDF destination
 * @param {object} [options]
 * @param {number} [options.timeout=30000]
 * @returns {{ success: boolean, outputPath?: string, error?: string }}
 */
function renderHtmlToPdf(htmlFilePath, pdfOutputPath, options = {}) {
  const browser = findBrowserExecutable();
  if (!browser) {
    return {
      success: false,
      error: 'No compatible headless browser (Edge, Chrome, Chromium) detected on this system. Please install Edge or Chrome or specify BROWSER_PATH.'
    };
  }

  const resolvedHtml = path.resolve(htmlFilePath);
  const resolvedPdf = path.resolve(pdfOutputPath);

  if (!fs.existsSync(resolvedHtml)) {
    return {
      success: false,
      error: `Input HTML file not found: ${resolvedHtml}`
    };
  }

  // Ensure output directory exists
  const outDir = path.dirname(resolvedPdf);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Windows file URI
  const fileUrl = 'file:///' + resolvedHtml.replace(/\\/g, '/');

  const args = [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${resolvedPdf}`,
    fileUrl
  ];

  try {
    const result = spawnSync(browser, args, {
      timeout: options.timeout || 30000,
      stdio: 'pipe'
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message
      };
    }

    if (fs.existsSync(resolvedPdf) && fs.statSync(resolvedPdf).size > 0) {
      return {
        success: true,
        outputPath: resolvedPdf
      };
    }

    return {
      success: false,
      error: `Browser command completed but PDF file was not created or empty: ${result.stderr ? result.stderr.toString() : 'Unknown error'}`
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  findBrowserExecutable,
  renderHtmlToPdf
};
