/* ============================================================
   layout.test.js
   Real-browser layout tests (Chromium via Playwright).

   Exists because of a shipped bug: the hero was min-height:100svh,
   which put the release list at exactly the fold. Every embed
   rendered correctly and the DOM tests passed clean — the page
   simply looked empty, because jsdom does no layout and so can
   never catch "correct but off-screen".

   The load-bearing assertion is therefore that the release list
   is actually ON SCREEN at rest, on every viewport worth caring
   about: the player's artwork and its whole first row.

       npm run setup      # once: deps + chromium
       (cd .. && npm run build)               # produce dist/
       node layout.test.js                    # local build
       node layout.test.js https://gxmbymusic.uk/   # production
   ============================================================ */

const { chromium } = require('playwright');
const { target } = require('./serve');

const VIEWPORTS = [
    { name: 'iPhone SE',     width: 375,  height: 667 },
    { name: 'iPhone 14 Pro', width: 393,  height: 852 },
    { name: 'iPad portrait', width: 768,  height: 1024 },
    { name: 'Laptop 1280',   width: 1280, height: 800 },
    { name: 'Desktop 1440',  width: 1440, height: 900 },
    { name: 'Short laptop',  width: 1366, height: 640 },
];

(async () => {
    const { base, close } = await target(process.argv[2]);
    console.log(`testing ${base}\n`);

    const browser = await chromium.launch();
    let fails = 0;

    for (const vp of VIEWPORTS) {
        const page = await browser.newPage({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: 1,
        });

        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await page.goto(base, { waitUntil: 'load' });
        await page.waitForTimeout(1800);

        const m = await page.evaluate(() => {
            const box = sel => document.querySelector(sel).getBoundingClientRect();
            const art = box('.gx-player .photo-wrapper');
            const row = box('.gx-player .songs .song');
            return {
                rows: document.querySelectorAll('.gx-player .songs .song').length,
                iframes: document.querySelectorAll('iframe').length,
                heading: Math.round(box('.releases-heading').top),
                artTop: Math.round(art.top),
                rowTop: Math.round(row.top),
                rowBottom: Math.round(row.bottom),
                hscroll: document.documentElement.scrollWidth > window.innerWidth,
                vh: window.innerHeight,
            };
        });

        const problems = [];
        if (m.rows !== 12) problems.push(`${m.rows} rows`);
        if (m.iframes !== 0) problems.push(`${m.iframes} iframes eagerly mounted`);
        if (m.heading >= m.vh) problems.push('heading below fold');
        if (m.artTop >= m.vh) problems.push('artwork below fold');
        if (m.rowBottom > m.vh) problems.push(`row 1 not fully visible (bottom ${m.rowBottom})`);
        if (m.hscroll) problems.push('horizontal scroll');
        if (errs.length) problems.push(`js errors: ${errs.join('; ')}`);

        if (problems.length) fails++;
        console.log(
            `${problems.length ? 'FAIL' : 'ok  '}  ${vp.name.padEnd(15)}` +
            `${String(vp.width).padStart(4)}x${String(vp.height).padEnd(5)}` +
            ` heading@${String(m.heading).padStart(4)} art@${String(m.artTop).padStart(4)}` +
            ` row1 ${String(m.rowTop).padStart(4)}–${String(m.rowBottom).padEnd(4)}` +
            (problems.length ? `  <- ${problems.join(', ')}` : '')
        );

        await page.close();
    }

    await browser.close();
    close();

    console.log(fails
        ? `\n${fails} viewport(s) failed`
        : '\nArtwork and first release are above the fold on every viewport');
    process.exit(fails ? 1 : 0);
})();
