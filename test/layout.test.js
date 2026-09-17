/* ============================================================
   layout.test.js
   Real-browser layout tests (Chromium via Playwright).

   Exists because of a shipped bug: the hero was min-height:100svh,
   which put the release list at exactly the fold. Every embed
   rendered correctly and accordion.test.js passed clean — the
   page simply looked empty, because jsdom does no layout and so
   can never catch "correct but off-screen".

   The load-bearing assertion is therefore that the first embed is
   actually ON SCREEN at rest, on every viewport worth caring about.

   Serves the repo itself on an ephemeral port, so no external
   server is needed:

       npm run setup      # once: deps + chromium
       node layout.test.js                    # local files
       node layout.test.js https://gxmbymusic.uk/   # production
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');

const TYPES = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.mp3': 'audio/mpeg', '.json': 'application/json', '.woff2': 'font/woff2',
    '.ttf': 'font/ttf', '.otf': 'font/otf', '.png': 'image/png', '.jpg': 'image/jpeg',
};

const VIEWPORTS = [
    { name: 'iPhone SE',     width: 375,  height: 667 },
    { name: 'iPhone 14 Pro', width: 393,  height: 852 },
    { name: 'iPad portrait', width: 768,  height: 1024 },
    { name: 'Laptop 1280',   width: 1280, height: 800 },
    { name: 'Desktop 1440',  width: 1440, height: 900 },
    { name: 'Short laptop',  width: 1366, height: 640 },
];

// At least this much of the first embed must be on screen without scrolling.
const MIN_VISIBLE_PCT = 60;

function serve() {
    const server = http.createServer((req, res) => {
        const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
        const file = path.join(ROOT, rel);
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404).end('not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
    const override = process.argv[2];
    const server = override ? null : await serve();
    const base = override || `http://127.0.0.1:${server.address().port}/index.html`;
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
            const box = (el) => el.getBoundingClientRect();
            const row = document.querySelector('.media-row');
            const b = box(row.querySelector('.media-frame-box'));
            return {
                rows: document.querySelectorAll('.media-row').length,
                iframes: document.querySelectorAll('iframe').length,
                heading: Math.round(box(document.querySelector('.releases-heading')).top),
                trigger: Math.round(box(row.querySelector('.media-trigger')).top),
                top: Math.round(b.top),
                bottom: Math.round(b.bottom),
                vh: window.innerHeight,
            };
        });

        const visible = Math.max(0, Math.min(m.bottom, m.vh) - Math.max(m.top, 0));
        const pct = Math.round((visible / (m.bottom - m.top)) * 100);

        const problems = [];
        if (m.rows !== 12) problems.push(`${m.rows} rows`);
        if (m.iframes !== 1) problems.push(`${m.iframes} iframes eagerly mounted`);
        if (m.heading >= m.vh) problems.push('heading below fold');
        if (m.trigger >= m.vh) problems.push('row 1 below fold');
        if (pct < MIN_VISIBLE_PCT) problems.push(`embed only ${pct}% visible`);
        if (errs.length) problems.push(`js errors: ${errs.join('; ')}`);

        if (problems.length) fails++;
        console.log(
            `${problems.length ? 'FAIL' : 'ok  '}  ${vp.name.padEnd(15)}` +
            `${String(vp.width).padStart(4)}x${String(vp.height).padEnd(5)}` +
            ` heading@${String(m.heading).padStart(4)} row1@${String(m.trigger).padStart(4)}` +
            ` embed ${String(pct).padStart(3)}% visible` +
            (problems.length ? `  <- ${problems.join(', ')}` : '')
        );

        await page.close();
    }

    await browser.close();
    if (server) server.close();

    console.log(fails
        ? `\n${fails} viewport(s) failed`
        : '\nFirst embed is above the fold on every viewport');
    process.exit(fails ? 1 : 0);
})();
