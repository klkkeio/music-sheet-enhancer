---
name: music-sheet-enhancer
description: Vectorize, enhance, and export crystal-clear music reading workbooks, sheets, and answer keys in multiple languages (English, zh-TW, zh-HK, zh-CN) from scanned or blurry music sheets.
---

# Music Sheet Enhancer Skill

This skill transforms degraded, blurry, or low-resolution photocopied music sheets into publication-grade, ultra-sharp vector workbooks, single-page reference sheets, and automated answer keys.

---

## 1. When to Use This Skill

Activate this skill when:
- The user provides a photo, photocopy, or blurry PDF scan of sheet music or note identification exercises and wants a clear, large-print, or kid-friendly version.
- The user needs multi-lingual worksheets supporting English, Traditional Chinese (`zh-TW`, `zh-HK`), Simplified Chinese (`zh-CN`), or any custom culture code.
- The user needs paired answer keys (with bold note letter names and solfège syllables) for parents, teachers, or self-checking students.
- The user wants to generate print-ready A4 PDFs or portable standalone HTML files.

---

## 2. Supported Formats & Layouts

| Format ID | Target Page Count | Layout Characteristics | Ideal Use Case |
|:---|:---|:---|:---|
| **`workbook`** | 4 Pages (A4) | Large-print, generous stave height (135px), `#1`..`#n` numbered answer boxes, mnemonic cards, and footer motivational milestones. | Young beginners, children learning treble & bass clefs. |
| **`workbook-answers`** | 4 Pages (A4) | Tinted blue answer boxes displaying bold note letters (e.g. `C`, `E`, `G`) and solfège syllables (e.g. `do`, `mi`, `sol`). | Teachers, parents, quick grading. |
| **`single`** | 1 Page (A4) | 1:1 compact restoration of 7 staves with clef indicators on the left and horizontal answer blanks below notes. | Advanced practice, paper-saving single-sheet print. |
| **`single-answers`** | 1 Page (A4) | 1-page compact sheet with letter answers in blue boxes. | Quick reference sheet. |

---

## 3. Supported Languages & Culture Codes

Built-in dictionaries:
- `en`: English (default fallback)
- `zh-TW`: Traditional Chinese (Taiwan conventions: 學生姓名, 練習卷, 參考答案)
- `zh-HK`: Traditional Chinese (Hong Kong conventions: 學生姓名, 工作紙, 參考答案)
- `zh-CN`: Simplified Chinese (简体中文: 学生姓名, 练习卷, 参考答案)

### Extensibility:
Any valid BCP 47 language code is automatically negotiated:
- Subtag prefixes (e.g. `en-US`, `en-AU`, `en-GB`) map to `en`.
- Script subtags (e.g. `zh-Hans`, `zh-Hans-CN`, `zh-SG`) map to `zh-CN`.
- Script subtags (e.g. `zh-Hant`, `zh-Hant-TW`) map to `zh-TW`.
- Script subtags (e.g. `zh-Hant-HK`, `zh-MO`) map to `zh-HK`.
- Custom languages (e.g. `ja`, `es`, `fr`, `de`): Provide a custom locale JSON file with `--locale-file <path>` or `i18n.registerLocale(code, dict)`.

---

## 4. End-to-End Workflow: From Blurry Scan to Vector Sheet

When given an uploaded scan or PDF:

### Step 1: Note Transcription
Analyze the noteheads on each stave from left to right. Transcribe each note to scientific pitch notation:
- Key format: `<step>/<octave>` (e.g. `c/4`, `e/4`, `g/4`, `b/4`, `d/5`, `f/5`).
- Pitch naming:
  - Middle C is `c/4`.
  - Treble stave lines (bottom to top): `e/4`, `g/4`, `b/4`, `d/5`, `f/5`.
  - Treble stave spaces (bottom to top): `f/4`, `a/4`, `c/5`, `e/5`.
  - Bass stave lines (bottom to top): `g/2`, `b/2`, `d/3`, `f/3`, `a/3`.
  - Bass stave spaces (bottom to top): `a/2`, `c/3`, `e/3`, `g/3`.
- Important: In VexFlow 5, always specify `{ clef: 'bass', keys: [...] }` for bass clef notes to prevent treble clef default clipping.

### Step 2: Validate Note Dataset
Store notes in a JSON dataset adhering to `data/schema.json`:
```json
[
  {
    "id": 1,
    "clef": "treble",
    "notes": [
      { "key": "e/4", "letter": "E", "solfege": "mi" },
      { "key": "g/4", "letter": "G", "solfege": "sol" }
    ]
  }
]
```

### Step 3: Run Enhancer CLI
```bash
# Generate 4-page workbook & answer key in Traditional Chinese (Taiwan) with PDFs
node bin/cli.js --format all --lang zh-TW --pdf

# Generate English single-page sheets
node bin/cli.js --format single --lang en --pdf
```

---

## 5. Programmatic API

```javascript
const {
  generateWorkbookHtml,
  generateSinglePageHtml,
  renderHtmlToPdf,
  createTranslator
} = require('music-sheet-enhancer');

// Generate HTML string
const html = generateWorkbookHtml({
  exercises: myExercisesArray,
  locale: 'zh-HK',
  isAnswerKey: false,
  standalone: true // Embeds VexFlow inline for portable offline viewing
});

// Compile directly to PDF
renderHtmlToPdf('dist/sheet.html', 'dist/sheet.pdf');
```
