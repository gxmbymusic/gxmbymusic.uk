/* ============================================================
   accordion.test.js
   Behaviour + curation tests for media.js, under jsdom.

   Covers the catalogue rules (named uploads only, YouTube wins
   duplicates), recency ordering, lazy iframe mounting and the
   single-open invariant.

   NOTE: jsdom performs no layout, so this file can say nothing
   about whether anything is actually *visible*. That is what
   layout.test.js is for — a fold-visibility regression once
   shipped with this suite entirely green.

       node accordion.test.js
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
window.Element.prototype.scrollIntoView = function () {};

// media.js only — engine.js/particles.js need a real canvas context
window.eval(fs.readFileSync(path.join(ROOT, 'media.js'), 'utf8'));

const doc = window.document;
let fails = 0;
const check = (label, cond, extra = '') => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? '  ' + extra : '')); }
    else console.log('ok    ' + label);
};

const frame = () => new Promise(r => window.requestAnimationFrame(() => setTimeout(r, 0)));
const click = async (row) => {
    row.querySelector('.media-trigger').dispatchEvent(new window.Event('click', { bubbles: true }));
    await frame();
};

(async () => {
    const rows = [...doc.querySelectorAll('.media-row')];
    await frame();
    check('12 rows rendered', rows.length === 12, `got ${rows.length}`);

    // --- ordering: strictly newest -> oldest ---------------------------
    const dates = rows.map(r => r.querySelector('.media-date').textContent);
    const parsed = dates.map(d => new Date(d.replace(/(\d+) (\w+) (\d+)/, '$2 $1, $3')));
    let ordered = true;
    for (let i = 1; i < parsed.length; i++) if (parsed[i] > parsed[i - 1]) ordered = false;
    check('ordered newest -> oldest', ordered, dates.join(' | '));

    // --- first panel open on load, others closed ------------------------
    check('row 1 is open', rows[0].classList.contains('is-open'));
    check('row 1 trigger aria-expanded=true',
        rows[0].querySelector('.media-trigger').getAttribute('aria-expanded') === 'true');
    check('only one row open', rows.filter(r => r.classList.contains('is-open')).length === 1);

    // --- lazy mounting ---------------------------------------------------
    check('only 1 iframe mounted on load',
        doc.querySelectorAll('iframe').length === 1,
        `got ${doc.querySelectorAll('iframe').length}`);

    const first = rows[0].querySelector('iframe');
    check('row 1 iframe is the newest SoundCloud track',
        first && /w\.soundcloud\.com\/player\/\?url=.*gxmby%2Freaoons/.test(first.src),
        first && first.src);

    // --- expanding another row closes the first -------------------------
    await click(rows[4]);
    check('row 5 now open', rows[4].classList.contains('is-open'));
    check('row 1 auto-closed', !rows[0].classList.contains('is-open'));
    check('still only one row open', rows.filter(r => r.classList.contains('is-open')).length === 1);
    check('2 iframes mounted after 2nd expand',
        doc.querySelectorAll('iframe').length === 2,
        `got ${doc.querySelectorAll('iframe').length}`);
    check('row 1 iframe kept alive (preserves playhead)',
        rows[0].querySelector('iframe') !== null);

    // --- clicking an open row collapses it ------------------------------
    await click(rows[4]);
    check('row 5 collapses on second click', !rows[4].classList.contains('is-open'));
    check('zero rows open after collapse',
        rows.filter(r => r.classList.contains('is-open')).length === 0);

    // --- race: open+close inside one frame must not re-open -------------
    rows[7].querySelector('.media-trigger').dispatchEvent(new window.Event('click', { bubbles: true }));
    rows[7].querySelector('.media-trigger').dispatchEvent(new window.Event('click', { bubbles: true }));
    await frame();
    check('same-frame open+close leaves row closed', !rows[7].classList.contains('is-open'));

    // --- mount every embed ----------------------------------------------
    for (const r of rows) await click(r);

    const frames = [...doc.querySelectorAll('iframe')];
    check('all 12 embeds mount', frames.length === 12, `got ${frames.length}`);

    const ytFrames = frames.filter(f => f.src.includes('youtube.com/embed'));
    const scFrames = frames.filter(f => f.src.includes('w.soundcloud.com'));
    check('9 youtube + 3 soundcloud embeds',
        ytFrames.length === 9 && scFrames.length === 3,
        `yt=${ytFrames.length} sc=${scFrames.length}`);
    check('every youtube embed has enablejsapi',
        ytFrames.every(f => f.src.includes('enablejsapi=1')));
    check('no duplicate embed srcs', new Set(frames.map(f => f.src)).size === 12);

    check('2 shorts flagged for 9:16',
        doc.querySelectorAll('.media-row--short').length === 2,
        `got ${doc.querySelectorAll('.media-row--short').length}`);

    // --- curation rules ---------------------------------------------------
    const titles = rows.map(r => r.querySelector('.media-title').textContent);
    check('no untitled uploads', !titles.some(t => /^untitled$/i.test(t.trim())),
        titles.filter(t => /^untitled$/i.test(t.trim())).join(', '));
    check('no date-as-title uploads',
        !titles.some(t => /^\d{1,2} \w+ \d{4}$/.test(t.trim())));
    check('no hashtags leaked into titles', !titles.some(t => t.includes('#')));
    check('no title appears on both platforms',
        new Set(titles.map(t => t.toLowerCase())).size === titles.length,
        titles.join(' | '));

    // --- accessibility wiring ---------------------------------------------
    check('every trigger controls its panel', rows.every((r) => {
        const b = r.querySelector('.media-trigger');
        const p = r.querySelector('.media-panel');
        return b.getAttribute('aria-controls') === p.id && p.getAttribute('aria-labelledby') === b.id;
    }));

    const links = [...doc.querySelectorAll('.media-permalink')];
    check('12 permalinks, all absolute + rel=noopener',
        links.length === 12 && links.every(a => /^https:\/\//.test(a.href) && a.rel.includes('noopener')));

    console.log(fails ? `\n${fails} FAILURE(S)` : '\nAll checks passed');
    process.exit(fails ? 1 : 0);
})();
