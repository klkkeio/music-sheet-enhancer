#!/usr/bin/env node

/**
 * cli.js - Command-Line Interface for Music Sheet Enhancer
 */

const fs = require('fs');
const path = require('path');
const {
  generateWorkbookHtml,
  generateSinglePageHtml,
  renderHtmlToPdf,
  findBrowserExecutable,
  loadLocaleFromFile,
  resolveLocale,
  getAvailableLocales
} = require('../src/index');

const pkg = require('../package.json');

function printHelp() {
  console.log(`
Music Sheet Enhancer v${pkg.version}
Vectorize, enhance, and export beautiful music reading worksheets and answer keys.

USAGE:
  music-sheet-enhancer [options]
  node bin/cli.js [options]

OPTIONS:
  -f, --format <type>       Format to generate:
                            workbook | workbook-answers | single | single-answers | all
                            (default: "all")
  -l, --lang <code>         Language / BCP 47 culture code:
                            en | zh-CN | zh-HK | zh-TW | en-US | zh-Hant ...
                            (default: "en")
  -d, --data <file>         Path to custom exercises JSON dataset
                            (default: "data/note-exercises.json")
  -o, --out <dir>           Output directory (default: "dist")
  --pdf                     Compile to PDF via headless browser (Edge/Chrome)
  --no-html                 Do not keep generated HTML files after PDF compilation
  --standalone              Embed VexFlow inline for 100% offline self-contained HTML
  --locale-file <file>      Path to custom locale dictionary JSON file
  -h, --help                Show this help message
  -v, --version             Display version information

EXAMPLES:
  # Generate all HTML sheets in English
  music-sheet-enhancer --lang en

  # Generate 4-page Kids Workbook in Traditional Chinese (Hong Kong) with PDFs
  music-sheet-enhancer --format workbook --lang zh-HK --pdf

  # Generate Single-page exercise sheet in Traditional Chinese (Taiwan)
  music-sheet-enhancer --format single --lang zh-TW

  # Use custom exercises data and output to a custom directory
  music-sheet-enhancer --data ./my-exercises.json --out ./output --lang en --pdf
`);
}

function parseArgs(args) {
  const options = {
    format: 'all',
    lang: 'en',
    data: path.resolve(__dirname, '..', 'data', 'note-exercises.json'),
    out: path.resolve(process.cwd(), 'dist'),
    pdf: false,
    html: true,
    standalone: true,
    localeFile: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }
    if (arg === '-v' || arg === '--version') {
      console.log(`v${pkg.version}`);
      process.exit(0);
    }
    if (arg === '-f' || arg === '--format') {
      options.format = args[++i];
    } else if (arg === '-l' || arg === '--lang') {
      options.lang = args[++i];
    } else if (arg === '-d' || arg === '--data') {
      options.data = path.resolve(args[++i]);
    } else if (arg === '-o' || arg === '--out') {
      options.out = path.resolve(args[++i]);
    } else if (arg === '--pdf') {
      options.pdf = true;
    } else if (arg === '--no-html') {
      options.html = false;
    } else if (arg === '--standalone') {
      options.standalone = true;
    } else if (arg === '--locale-file') {
      options.localeFile = path.resolve(args[++i]);
    }
  }

  return options;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  // Load custom locale file if provided
  if (options.localeFile) {
    if (!fs.existsSync(options.localeFile)) {
      console.error(`Error: Custom locale file not found: ${options.localeFile}`);
      process.exit(1);
    }
    try {
      const registeredCode = loadLocaleFromFile(options.localeFile);
      options.lang = registeredCode;
      console.log(`✓ Loaded custom locale from ${options.localeFile} as [${registeredCode}]`);
    } catch (err) {
      console.error(`Error loading locale file: ${err.message}`);
      process.exit(1);
    }
  }

  const resolvedLocale = resolveLocale(options.lang);
  console.log(`🎵 Music Sheet Enhancer`);
  console.log(`   Format:   ${options.format}`);
  console.log(`   Locale:   ${resolvedLocale} (requested: "${options.lang}")`);
  console.log(`   Data:     ${options.data}`);
  console.log(`   Output:   ${options.out}`);
  console.log(`   PDF Mode: ${options.pdf ? 'Enabled' : 'Disabled'}`);

  // Load exercises data
  if (!fs.existsSync(options.data)) {
    console.error(`Error: Exercise data file not found at: ${options.data}`);
    process.exit(1);
  }

  let exercises;
  try {
    exercises = JSON.parse(fs.readFileSync(options.data, 'utf8'));
  } catch (err) {
    console.error(`Error parsing JSON from ${options.data}: ${err.message}`);
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(options.out)) {
    fs.mkdirSync(options.out, { recursive: true });
  }

  const tasks = [];
  const fmt = options.format.toLowerCase();

  if (fmt === 'all' || fmt === 'workbook') {
    tasks.push({
      name: `Note_Reading_Workbook_Kids_${resolvedLocale}`,
      type: 'workbook',
      isAnswerKey: false
    });
  }
  if (fmt === 'all' || fmt === 'workbook-answers') {
    tasks.push({
      name: `Note_Reading_Workbook_Answer_Key_${resolvedLocale}`,
      type: 'workbook',
      isAnswerKey: true
    });
  }
  if (fmt === 'all' || fmt === 'single') {
    tasks.push({
      name: `Note_Reading_Single_Page_${resolvedLocale}`,
      type: 'single',
      isAnswerKey: false
    });
  }
  if (fmt === 'all' || fmt === 'single-answers') {
    tasks.push({
      name: `Note_Reading_Single_Page_Answers_${resolvedLocale}`,
      type: 'single',
      isAnswerKey: true
    });
  }

  if (tasks.length === 0) {
    console.error(`Error: Unknown format "${options.format}". Allowed values: workbook, workbook-answers, single, single-answers, all.`);
    process.exit(1);
  }

  let browserAvailable = null;
  if (options.pdf) {
    browserAvailable = findBrowserExecutable();
    if (!browserAvailable) {
      console.warn(`⚠️ Warning: Headless browser not detected. PDF compilation will be skipped.`);
    }
  }

  for (const task of tasks) {
    const htmlFileName = `${task.name}.html`;
    const htmlFilePath = path.join(options.out, htmlFileName);

    let html;
    if (task.type === 'workbook') {
      html = generateWorkbookHtml({
        exercises,
        locale: resolvedLocale,
        isAnswerKey: task.isAnswerKey,
        standalone: options.standalone
      });
    } else {
      html = generateSinglePageHtml({
        exercises,
        locale: resolvedLocale,
        isAnswerKey: task.isAnswerKey,
        standalone: options.standalone
      });
    }

    fs.writeFileSync(htmlFilePath, html, 'utf8');
    console.log(`  ✓ Generated HTML: ${htmlFileName}`);

    if (options.pdf && browserAvailable) {
      const pdfFileName = `${task.name}.pdf`;
      const pdfFilePath = path.join(options.out, pdfFileName);
      console.log(`    Compiling PDF: ${pdfFileName}...`);
      const res = renderHtmlToPdf(htmlFilePath, pdfFilePath);
      if (res.success) {
        console.log(`    ✓ PDF created: ${pdfFileName}`);
        if (!options.html) {
          fs.unlinkSync(htmlFilePath);
        }
      } else {
        console.error(`    ✗ PDF compilation failed: ${res.error}`);
      }
    }
  }

  console.log(`\n🎉 All tasks completed successfully! Output stored in: ${options.out}`);
}

if (require.main === module) {
  run();
}

module.exports = { parseArgs };
