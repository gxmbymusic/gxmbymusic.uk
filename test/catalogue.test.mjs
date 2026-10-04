/* ============================================================
   catalogue.test.mjs
   Curation rules for src/catalogue.js, in plain Node — the
   catalogue is pure data, so no DOM is needed. Ported from the
   retired accordion.test.js.

       node catalogue.test.mjs
   ============================================================ */

import { MEDIA, canonicalUrl, embedUrl, artUrl } from '../src/catalogue.js';

let fails = 0;
const check = (label, cond, extra = '') => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? '  ' + extra : '')); }
    else console.log('ok    ' + label);
};

check('12 releases', MEDIA.length === 12, `got ${MEDIA.length}`);

// --- ordering: strictly newest -> oldest ---------------------------
const dates = MEDIA.map(m => m.date);
check('ordered newest -> oldest', dates.every((d, i) => i === 0 || d <= dates[i - 1]), dates.join(' | '));
check('newest is the SoundCloud track "reasons"', MEDIA[0].kind === 'sc' && MEDIA[0].id === 'reaoons');

// --- platform split ---------------------------------------------------
const yt = MEDIA.filter(m => m.kind !== 'sc');
const sc = MEDIA.filter(m => m.kind === 'sc');
check('9 youtube + 3 soundcloud', yt.length === 9 && sc.length === 3, `yt=${yt.length} sc=${sc.length}`);
check('2 shorts flagged for 9:16', MEDIA.filter(m => m.kind === 'short').length === 2);
check('exactly one reactive item, and it is Expressions',
    MEDIA.filter(m => m.reactive).length === 1 && MEDIA.find(m => m.reactive).title === 'Expressions');

// --- embeds -------------------------------------------------------------
const srcs = MEDIA.map(embedUrl);
check('every youtube embed has enablejsapi', yt.every(m => embedUrl(m).includes('enablejsapi=1')));
check('every soundcloud embed targets gxmby', sc.every(m => embedUrl(m).includes('soundcloud.com%2Fgxmby%2F')));
check('no duplicate embed srcs', new Set(srcs).size === MEDIA.length);

// --- curation rules ---------------------------------------------------
const titles = MEDIA.map(m => m.title);
check('no untitled uploads', !titles.some(t => /^untitled$/i.test(t.trim())));
check('no date-as-title uploads', !titles.some(t => /^\d{1,2} \w+ \d{4}$/.test(t.trim())));
check('no hashtags leaked into titles', !titles.some(t => t.includes('#')));
check('no title appears on both platforms',
    new Set(titles.map(t => t.toLowerCase())).size === titles.length, titles.join(' | '));

// --- links + artwork --------------------------------------------------
check('every permalink is absolute https', MEDIA.every(m => /^https:\/\//.test(canonicalUrl(m))));
check('every release has artwork', MEDIA.every(m => /^https:\/\//.test(artUrl(m))));

console.log(fails ? `\n${fails} FAILURE(S)` : '\nAll checks passed');
process.exit(fails ? 1 : 0);
