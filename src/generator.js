/**
 * generator.js - Vector Music Sheet HTML & SVG Generation Engine
 * Generates beautiful, responsive, printable HTML sheets with VexFlow 5 vector rendering.
 */

const fs = require('fs');
const path = require('path');
const { createTranslator } = require('./i18n');
const { validateExercises, escapeHtml } = require('./validator');

const VEXFLOW_CDN = 'https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/cjs/vexflow.js';

/**
 * Get VexFlow script tag: either inlined for standalone offline portability or linked.
 * @param {boolean} standalone
 * @returns {string}
 */
function getVexFlowScript(standalone) {
  if (standalone) {
    const localPaths = [
      path.resolve(__dirname, '..', 'node_modules', 'vexflow', 'build', 'cjs', 'vexflow.js'),
      path.resolve(__dirname, '..', 'vendor', 'vexflow.js')
    ];
    for (const p of localPaths) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf8');
          return `<script>${content}</script>`;
        } catch (_) {}
      }
    }
  }
  // Default to relative local path with CDN fallback
  return `<script src="node_modules/vexflow/build/cjs/vexflow.js" onerror="this.onerror=null;this.src='${VEXFLOW_CDN}'"></script>`;
}

/**
 * Generate 4-Page Kid-Friendly Large-Print Workbook (or Answer Key)
 * @param {object} options
 * @param {Array} options.exercises - Validated exercise objects
 * @param {string} [options.locale='en'] - Culture / locale code
 * @param {boolean} [options.isAnswerKey=false] - Whether to render answer key
 * @param {boolean} [options.standalone=true] - Embed self-contained VexFlow script
 * @param {object} [options.customDict] - Optional locale overrides
 * @returns {string} HTML string
 */
function generateWorkbookHtml(options = {}) {
  const {
    exercises: rawExercises,
    locale = 'en',
    isAnswerKey = false,
    standalone = false,
    customDict = null
  } = options;

  const validation = validateExercises(rawExercises);
  if (!validation.valid) {
    throw new Error(`Invalid exercises data:\n${validation.errors.join('\n')}`);
  }
  const exercises = validation.sanitized;
  const t = createTranslator(locale, customDict);

  const title = t('workbook.title');
  const badgeText = isAnswerKey ? t('workbook.answerKeyBadge') : t('workbook.worksheetBadge');
  const badgeStyle = isAnswerKey
    ? 'background: #dbeafe; color: #1e40af;'
    : 'background: #e0e7ff; color: #3730a3;';

  const defaultSplits = { 1: 9, 2: 9, 3: 10, 4: 9, 5: 11, 6: 9, 7: 10 };
  const isStandard7 = exercises.length === 7;
  const totalNotesAll = exercises.reduce((sum, ex) => sum + ex.notes.length, 0);

  let pagesHtml;

  if (isStandard7) {
    // Standard 4-Page Course Layout
    pagesHtml = [
      renderPage({
        pageNum: 1,
        totalPages: 4,
        totalScoreText: '36 / 36',
        subtitle: t('workbook.page1Subtitle'),
        tip: t('workbook.tips.treble'),
        footer: t('workbook.page1Footer'),
        exercises: exercises.slice(0, 2),
        isAnswerKey,
        t
      }),
      renderPage({
        pageNum: 2,
        totalPages: 4,
        totalScoreText: '37 / 37',
        subtitle: t('workbook.page2Subtitle'),
        tip: t('workbook.tips.bass'),
        footer: t('workbook.page2Footer'),
        exercises: exercises.slice(2, 4),
        isAnswerKey,
        t
      }),
      renderPage({
        pageNum: 3,
        totalPages: 4,
        totalScoreText: '39 / 39',
        subtitle: t('workbook.page3Subtitle'),
        tip: null,
        footer: t('workbook.page3Footer'),
        exercises: exercises.slice(4, 6),
        isAnswerKey,
        t
      }),
      renderPage4({
        pageNum: 4,
        totalPages: 4,
        totalScoreText: '131 / 131 ⭐',
        subtitle: t('workbook.page4Subtitle'),
        footer: t('workbook.page4Footer'),
        exercise: exercises[6],
        isAnswerKey,
        t
      })
    ].join('\n');
  } else {
    // Dynamic Pagination for Arbitrary Exercise Datasets
    const totalPages = Math.ceil(exercises.length / 2);
    const pages = [];

    for (let p = 0; p < totalPages; p++) {
      const pageNum = p + 1;
      const isLastPage = pageNum === totalPages;
      const pageExercises = exercises.slice(p * 2, p * 2 + 2);
      const pageNotesCount = pageExercises.reduce((sum, ex) => sum + ex.notes.length, 0);

      // Has treble or bass clefs
      const hasTreble = pageExercises.some(ex => ex.clef === 'treble');
      const hasBass = pageExercises.some(ex => ex.clef === 'bass');
      const tip = hasTreble && !hasBass
        ? t('workbook.tips.treble')
        : (!hasTreble && hasBass ? t('workbook.tips.bass') : null);

      if (isLastPage && pageExercises.length === 1) {
        // 1 exercise on final page: render with cheat sheet card
        pages.push(renderPage4({
          pageNum,
          totalPages,
          totalScoreText: `${totalNotesAll} / ${totalNotesAll} ⭐`,
          subtitle: t('workbook.page4Subtitle'),
          footer: t('workbook.page4Footer'),
          exercise: pageExercises[0],
          isAnswerKey,
          t
        }));
      } else {
        pages.push(renderPage({
          pageNum,
          totalPages,
          totalScoreText: `${pageNotesCount} / ${pageNotesCount}`,
          subtitle: t('workbook.page1Subtitle'),
          tip,
          footer: isLastPage ? t('workbook.page4Footer') : t('workbook.page1Footer'),
          exercises: pageExercises,
          isAnswerKey,
          t
        }));
      }
    }
    pagesHtml = pages.join('\n');
  }

  return `<!DOCTYPE html>
<html lang="${escapeHtml(t.locale)}">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} - ${escapeHtml(badgeText)}</title>
  ${getVexFlowScript(standalone)}
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 12mm 8mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft JhengHei", "Microsoft YaHei", sans-serif;
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #1e293b;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 10mm 14mm 8mm 14mm;
      margin: 10px auto;
      background: white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.06);
      position: relative;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    @media print {
      body { background: white; margin: 0; }
      .page {
        margin: 0;
        box-shadow: none;
        width: 100%;
        min-height: 100vh;
        page-break-after: always;
      }
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .main-title {
      font-size: 19px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      ${badgeStyle}
    }
    .sub-title {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .info-bar {
      display: flex;
      justify-content: flex-start;
      gap: 36px;
      font-size: 13px;
      color: #334155;
      margin-top: 6px;
      padding: 6px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      min-height: 44px;
      align-items: center;
      flex-wrap: nowrap;
    }
    .info-item {
      display: inline-flex;
      align-items: flex-end;
      gap: 6px;
      white-space: nowrap;
      height: 30px;
      line-height: 1.2;
    }
    .info-label {
      font-weight: 700;
      color: #334155;
      white-space: nowrap;
      margin-bottom: 2px;
    }
    .underline-fill {
      display: inline-flex;
      align-items: flex-end;
      justify-content: center;
      min-width: 125px;
      height: 28px;
      border-bottom: 2px solid #64748b;
      padding-bottom: 2px;
      vertical-align: bottom;
      font-size: 13.5px;
      font-weight: 700;
      color: #1e40af;
      white-space: nowrap;
    }
    .tip-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid #16a34a;
      padding: 5px 12px;
      border-radius: 6px;
      margin-bottom: 10px;
      font-size: 11.5px;
      color: #166534;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tip-title {
      font-weight: 700;
      color: #14532d;
    }
    .exercise-section {
      margin-bottom: 26px;
    }
    .exercise-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }
    .exercise-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .hand-badge {
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      background: #fef3c7;
      color: #92400e;
    }
    .hand-badge-lh {
      background: #dcfce7;
      color: #166534;
    }
    .exercise-sub {
      font-size: 11px;
      color: #64748b;
    }
    .stave-wrapper {
      position: relative;
      margin-bottom: 4px;
      background: white;
      border-radius: 6px;
    }
    .stave-wrapper svg {
      width: 100%;
      height: 172px;
      display: block;
    }
    .page-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 4px;
    }
    .ans-letter {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      font-size: 15px;
      font-weight: 800;
      fill: #2563eb;
      text-anchor: middle;
    }
    .ans-solfege {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      font-size: 10px;
      font-weight: 400;
      fill: #475569;
      text-anchor: middle;
      letter-spacing: 0.3px;
    }
    .note-index {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      font-size: 9.5px;
      font-weight: 500;
      fill: #64748b;
      text-anchor: middle;
    }
  </style>
</head>
<body>
  ${pagesHtml}

  <script>
    const isAnswerKey = ${JSON.stringify(isAnswerKey)};
    const exercisesData = ${JSON.stringify(exercises)};
    const defaultSplits = ${JSON.stringify(defaultSplits)};
    const { Renderer, Stave, StaveNote, Formatter } = VexFlow;

    function renderSubStave(containerId, clef, notesSlice, startIndex) {
      const div = document.getElementById(containerId);
      if (!div) return;
      div.innerHTML = '';

      const w = 680;
      const h = 172;
      const renderer = new Renderer(div, Renderer.Backends.SVG);
      renderer.resize(w, h);
      const context = renderer.getContext();

      const staveX = 5;
      const staveY = 10;
      const staveW = w - 10;
      const stave = new Stave(staveX, staveY, staveW);
      stave.addClef(clef);
      stave.setContext(context).draw();

      const staveNotes = notesSlice.map(item => new StaveNote({
        clef: clef,
        keys: [item.key],
        duration: 'w'
      }));

      Formatter.FormatAndDraw(context, stave, staveNotes);

      const svg = div.querySelector('svg');
      // Placed with ample space (30px) below bottom staff line (y=90) to support lower ledger lines
      const boxY = 120;
      const boxW = 34;
      const boxH = 32;

      staveNotes.forEach((sn, idx) => {
        // Calculate true mathematical center of notehead
        const noteBeginX = sn.getNoteHeadBeginX ? sn.getNoteHeadBeginX() : sn.getAbsoluteX();
        const noteEndX = sn.getNoteHeadEndX ? sn.getNoteHeadEndX() : (noteBeginX + (sn.getGlyphWidth ? sn.getGlyphWidth() : 16.88));
        const noteCenterX = (noteBeginX + noteEndX) / 2;

        const globalIdx = startIndex + idx;
        const item = notesSlice[idx];

        if (isAnswerKey) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', noteCenterX - boxW/2);
          rect.setAttribute('y', boxY);
          rect.setAttribute('width', boxW);
          rect.setAttribute('height', boxH);
          rect.setAttribute('rx', '5');
          rect.setAttribute('fill', '#eff6ff');
          rect.setAttribute('stroke', '#3b82f6');
          rect.setAttribute('stroke-width', '1.5');
          svg.appendChild(rect);

          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', noteCenterX);
          txt.setAttribute('y', boxY + 17);
          txt.setAttribute('class', 'ans-letter');
          txt.textContent = item.letter;
          svg.appendChild(txt);

          if (item.solfege) {
            const sol = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            sol.setAttribute('x', noteCenterX);
            sol.setAttribute('y', boxY + 28);
            sol.setAttribute('class', 'ans-solfege');
            sol.textContent = item.solfege;
            svg.appendChild(sol);
          }

          // Add question number under the block on answer key to align with question sheet
          const hint = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          hint.setAttribute('x', noteCenterX);
          hint.setAttribute('y', boxY + boxH + 13);
          hint.setAttribute('class', 'note-index');
          hint.textContent = '#' + globalIdx;
          svg.appendChild(hint);
        } else {
          // Worksheet: Completely empty block inside for student handwriting
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', noteCenterX - boxW/2);
          rect.setAttribute('y', boxY);
          rect.setAttribute('width', boxW);
          rect.setAttribute('height', boxH);
          rect.setAttribute('rx', '5');
          rect.setAttribute('fill', '#f8fafc');
          rect.setAttribute('stroke', '#cbd5e1');
          rect.setAttribute('stroke-width', '1.5');
          svg.appendChild(rect);

          // Question number placed cleanly UNDER the block with thinner font
          const hint = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          hint.setAttribute('x', noteCenterX);
          hint.setAttribute('y', boxY + boxH + 13);
          hint.setAttribute('class', 'note-index');
          hint.textContent = '#' + globalIdx;
          svg.appendChild(hint);
        }
      });
    }

    window.onload = () => {
      exercisesData.forEach(ex => {
        const splitIdx = defaultSplits[ex.id] || Math.ceil(ex.notes.length / 2);
        const part1 = ex.notes.slice(0, splitIdx);
        const part2 = ex.notes.slice(splitIdx);

        renderSubStave('stave-' + ex.id + '-1', ex.clef, part1, 1);
        renderSubStave('stave-' + ex.id + '-2', ex.clef, part2, splitIdx + 1);
      });
    };
  </script>
</body>
</html>`;
}

/**
 * Render standard 2-exercise page
 */
function renderPage({ pageNum, totalPages = 4, totalScoreText, subtitle, tip, footer, exercises, isAnswerKey, t }) {
  if (!exercises || exercises.length === 0) return '';
  const badgeText = isAnswerKey ? t('workbook.answerKeyBadge') : t('workbook.worksheetBadge');

  return `
  <div class="page" id="page${pageNum}">
    <div>
      <div class="header">
        <div class="title-row">
          <div class="main-title">
            <span>${escapeHtml(t('workbook.title'))}</span>
            <span class="badge">${escapeHtml(badgeText)}</span>
          </div>
          <div style="font-size: 12px; color: #64748b; font-weight: 600;">${escapeHtml(t('common.pageOf', { page: pageNum, total: totalPages }))}</div>
        </div>
        <div class="sub-title">${escapeHtml(subtitle)}</div>
        <div class="info-bar">
          <div class="info-item"><span class="info-label">${escapeHtml(t('common.studentName'))}</span><span class="underline-fill">${isAnswerKey ? '&nbsp;&nbsp;' + escapeHtml(t('common.standardAnswer')) : ''}</span></div>
          <div class="info-item"><span class="info-label">${escapeHtml(t('common.date'))}</span><span class="underline-fill"></span></div>
          <div class="info-item"><span class="info-label">${escapeHtml(t('common.score'))}</span><span class="underline-fill">${isAnswerKey ? '&nbsp;&nbsp;' + totalScoreText : ''}</span></div>
        </div>
      </div>

      ${tip ? `<div class="tip-card"><div>${escapeHtml(tip)}</div></div>` : ''}

      ${exercises.map(ex => renderExerciseSection(ex, t)).join('\n')}
    </div>

    <div class="page-footer">
      <div>${escapeHtml(footer)}</div>
      <div>${pageNum} / ${totalPages}</div>
    </div>
  </div>`;
}

/**
 * Render Page 4 with Exercise 7 and Cheat Sheet Card
 */
function renderPage4({ pageNum, totalPages = 4, totalScoreText, subtitle, footer, exercise, isAnswerKey, t }) {
  if (!exercise) return '';
  const badgeText = isAnswerKey ? t('workbook.answerKeyBadge') : t('workbook.worksheetBadge');

  return `
  <div class="page" id="page${pageNum}">
    <div>
      <div class="header">
        <div class="title-row">
          <div class="main-title">
            <span>${escapeHtml(t('workbook.title'))}</span>
            <span class="badge">${escapeHtml(badgeText)}</span>
          </div>
          <div style="font-size: 12px; color: #64748b; font-weight: 600;">${escapeHtml(t('common.pageOf', { page: pageNum, total: totalPages }))}</div>
        </div>
        <div class="sub-title">${escapeHtml(subtitle)}</div>
        <div class="info-bar">
          <div class="info-item"><span class="info-label">${escapeHtml(t('common.studentName'))}</span><span class="underline-fill">${isAnswerKey ? '&nbsp;&nbsp;' + escapeHtml(t('common.standardAnswer')) : ''}</span></div>
          <div class="info-item"><span class="info-label">${escapeHtml(t('common.totalScore'))}</span><span class="underline-fill" style="color:#2563eb; font-weight:bold;">${isAnswerKey ? '&nbsp;&nbsp;' + totalScoreText : `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ ${totalScoreText.split('/')[0].trim()} ⭐`}</span></div>
        </div>
      </div>

      ${renderExerciseSection(exercise, t)}

      <!-- Cheat Sheet Card -->
      <div style="margin-top: 8px; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 10px 14px; background: #fafafa;">
        <div style="font-size: 13.5px; font-weight: 800; color: #1e293b; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>${escapeHtml(t('workbook.cheatSheet.title'))}</span>
          <span style="font-size: 11px; color: #64748b; font-weight: normal;">${escapeHtml(t('workbook.cheatSheet.sub'))}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11.5px;">
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-weight: 700; color: #b45309; margin-bottom: 3px;">${escapeHtml(t('workbook.cheatSheet.trebleTitle'))}</div>
            <div>${escapeHtml(t('workbook.cheatSheet.trebleLines'))}</div>
            <div style="color: #64748b; font-size: 10.5px; margin-left: 8px;">${escapeHtml(t('workbook.cheatSheet.trebleLinesMnemonic'))}</div>
            <div style="margin-top: 3px;">${escapeHtml(t('workbook.cheatSheet.trebleSpaces'))}</div>
            <div style="color: #64748b; font-size: 10.5px; margin-left: 8px;">${escapeHtml(t('workbook.cheatSheet.trebleSpacesMnemonic'))}</div>
          </div>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-weight: 700; color: #15803d; margin-bottom: 3px;">${escapeHtml(t('workbook.cheatSheet.bassTitle'))}</div>
            <div>${escapeHtml(t('workbook.cheatSheet.bassLines'))}</div>
            <div style="color: #64748b; font-size: 10.5px; margin-left: 8px;">${escapeHtml(t('workbook.cheatSheet.bassLinesMnemonic'))}</div>
            <div style="margin-top: 3px;">${escapeHtml(t('workbook.cheatSheet.bassSpaces'))}</div>
            <div style="color: #64748b; font-size: 10.5px; margin-left: 8px;">${escapeHtml(t('workbook.cheatSheet.bassSpacesMnemonic'))}</div>
          </div>
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: #475569; text-align: center; background: #e0f2fe; padding: 5px; border-radius: 4px;">
          ${escapeHtml(t('workbook.cheatSheet.solfegeMapping'))}
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>${escapeHtml(footer)}</div>
      <div>${pageNum} / ${totalPages}</div>
    </div>
  </div>`;
}

/**
 * Render single exercise container with header and 2 stave wrappers
 */
function renderExerciseSection(ex, t) {
  const isTreble = ex.clef === 'treble';
  const handBadgeClass = isTreble ? 'hand-badge' : 'hand-badge hand-badge-lh';
  const handText = isTreble ? t('exercises.rh') : t('exercises.lh');

  const titleText = ex.title || t(`exercises.ex${ex.id}Title`, { n: ex.id }) || `Exercise ${ex.id}`;
  const subText = ex.subtitle || t(`exercises.ex${ex.id}Sub`, { count: ex.notes.length }) || `(${ex.notes.length} notes)`;

  return `
  <div class="exercise-section">
    <div class="exercise-header">
      <div class="exercise-title">
        <span>${escapeHtml(titleText)}</span>
        <span class="${handBadgeClass}">${escapeHtml(handText)}</span>
      </div>
      <div class="exercise-sub">${escapeHtml(subText)}</div>
    </div>
    <div class="stave-wrapper" id="stave-${ex.id}-1"></div>
    <div class="stave-wrapper" id="stave-${ex.id}-2"></div>
  </div>`;
}

/**
 * Generate 1-Page Restored Clean Sheet (or Answer Key)
 * @param {object} options
 * @param {Array} options.exercises - Validated exercise objects
 * @param {string} [options.locale='en'] - Culture / locale code
 * @param {boolean} [options.isAnswerKey=false] - Whether to render answer key
 * @param {boolean} [options.standalone=true] - Embed self-contained VexFlow script
 * @param {object} [options.customDict] - Optional locale overrides
 * @returns {string} HTML string
 */
function generateSinglePageHtml(options = {}) {
  const {
    exercises: rawExercises,
    locale = 'en',
    isAnswerKey = false,
    standalone = false,
    customDict = null
  } = options;

  const validation = validateExercises(rawExercises);
  if (!validation.valid) {
    throw new Error(`Invalid exercises data:\n${validation.errors.join('\n')}`);
  }
  const exercises = validation.sanitized;
  const t = createTranslator(locale, customDict);

  const title = t('singlePage.title');
  const subtitle = t('singlePage.subtitle');
  const clefHint = t('singlePage.clefHint');
  const footerText = t('singlePage.footer');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(t.locale)}">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}${isAnswerKey ? ' - ' + escapeHtml(t('workbook.answerKeyBadge')) : ''}</title>
  ${getVexFlowScript(standalone)}
  <style>
    @page {
      size: A4 portrait;
      margin: 4mm 8mm 4mm 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      margin: 0;
      padding: 0;
      background: white;
      color: #0f172a;
    }
    .page {
      width: 210mm;
      height: 297mm;
      padding: 4mm 8mm;
      margin: 0 auto;
      background: white;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      text-align: center;
      margin-bottom: 2px;
    }
    .title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .info-bar {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      margin: 2px 0 2px 0;
      padding: 4px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      align-items: center;
      flex-wrap: nowrap;
      white-space: nowrap;
    }
    .info-item {
      display: inline-flex;
      align-items: flex-end;
      gap: 6px;
      white-space: nowrap;
    }
    .info-label {
      font-weight: 700;
      color: #334155;
      white-space: nowrap;
    }
    .info-blank {
      display: inline-block;
      min-width: 90px;
      height: 20px;
      border-bottom: 1.5px solid #64748b;
      vertical-align: bottom;
      margin-left: 4px;
      white-space: nowrap;
    }
    .exercise-row {
      display: flex;
      align-items: center;
      margin-bottom: 0px;
    }
    .exercise-label {
      width: 52px;
      flex-shrink: 0;
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      line-height: 1.2;
    }
    .stave-container {
      flex-grow: 1;
      height: 126px;
    }
    .stave-container svg {
      width: 100%;
      height: 100%;
    }
    .ans-letter {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      font-size: 12px;
      font-weight: 800;
      fill: #2563eb;
      text-anchor: middle;
    }
    .footer {
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
      padding-top: 4px;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="page">
    <div>
      <div class="header">
        <div class="title">${escapeHtml(title)}</div>
        <div class="subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <div class="info-bar">
        <div class="info-item"><span class="info-label">${escapeHtml(t('common.studentName'))}</span><span class="info-blank" style="${isAnswerKey ? 'display:inline-flex;align-items:flex-end;color:#1e40af;font-weight:bold;' : ''}">${isAnswerKey ? '&nbsp;' + escapeHtml(t('common.standardAnswer')) : ''}</span></div>
        <div class="info-item"><span class="info-label">${escapeHtml(t('common.date'))}</span><span class="info-blank"></span></div>
        <div class="info-item" style="color:#64748b; font-size:11px;">${escapeHtml(clefHint)}</div>
        <div class="info-item"><span class="info-label">${escapeHtml(t('common.score'))}</span><span class="info-blank" style="min-width:60px;"></span></div>
      </div>

      ${exercises.map(ex => `
        <div class="exercise-row">
          <div class="exercise-label">
            <div style="font-size:16px; font-weight:800; color:#1e293b;">${ex.id}</div>
            <div style="font-size:10px; color:${ex.clef === 'treble' ? '#d97706' : '#15803d'}; font-weight:700;">
              ${ex.clef === 'treble' ? escapeHtml(t('exercises.rh')) : escapeHtml(t('exercises.lh'))}
            </div>
          </div>
          <div class="stave-container" id="stave-${ex.id}"></div>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      ${escapeHtml(footerText)}
    </div>
  </div>

  <script>
    const isAnswerKey = ${JSON.stringify(isAnswerKey)};
    const exercisesData = ${JSON.stringify(exercises)};
    const { Renderer, Stave, StaveNote, Formatter } = VexFlow;

    function renderStave(ex) {
      const div = document.getElementById('stave-' + ex.id);
      if (!div) return;

      const w = 705;
      const h = 126;
      const renderer = new Renderer(div, Renderer.Backends.SVG);
      renderer.resize(w, h);
      const context = renderer.getContext();

      const stave = new Stave(5, -2, w - 10);
      stave.addClef(ex.clef);
      stave.setContext(context).draw();

      const staveNotes = ex.notes.map(item => new StaveNote({
        clef: ex.clef,
        keys: [item.key],
        duration: 'w'
      }));

      Formatter.FormatAndDraw(context, stave, staveNotes);

      const svg = div.querySelector('svg');
      const boxY = 99;
      const boxW = 24;
      const boxH = 22;
      const lineY = 110;

      staveNotes.forEach((sn, idx) => {
        // Calculate true mathematical center of notehead
        const noteBeginX = sn.getNoteHeadBeginX ? sn.getNoteHeadBeginX() : sn.getAbsoluteX();
        const noteEndX = sn.getNoteHeadEndX ? sn.getNoteHeadEndX() : (noteBeginX + (sn.getGlyphWidth ? sn.getGlyphWidth() : 16.88));
        const noteCenterX = (noteBeginX + noteEndX) / 2;

        const item = ex.notes[idx];

        if (isAnswerKey) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', noteCenterX - boxW/2);
          rect.setAttribute('y', boxY);
          rect.setAttribute('width', boxW);
          rect.setAttribute('height', boxH);
          rect.setAttribute('rx', '3');
          rect.setAttribute('fill', '#eff6ff');
          rect.setAttribute('stroke', '#3b82f6');
          rect.setAttribute('stroke-width', '1');
          svg.appendChild(rect);

          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', noteCenterX);
          txt.setAttribute('y', boxY + 15);
          txt.setAttribute('class', 'ans-letter');
          txt.textContent = item.letter;
          svg.appendChild(txt);
        } else {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', noteCenterX - 11);
          line.setAttribute('x2', noteCenterX + 11);
          line.setAttribute('y1', lineY);
          line.setAttribute('y2', lineY);
          line.setAttribute('stroke', '#64748b');
          line.setAttribute('stroke-width', '1.5');
          svg.appendChild(line);
        }
      });
    }

    window.onload = () => {
      exercisesData.forEach(ex => renderStave(ex));
    };
  </script>
</body>
</html>`;
}

module.exports = {
  generateWorkbookHtml,
  generateSinglePageHtml
};
