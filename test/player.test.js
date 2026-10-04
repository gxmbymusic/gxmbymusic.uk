/* ============================================================
   player.test.js
   Behaviour of the MusicPlayer island, in Chromium against the
   built dist/. Replaces accordion.test.js (now _retired/) and
   keeps its invariants: lazy embeds, one panel at a time,
   embeds kept alive after closing, a11y wiring.

   Third-party requests (YouTube, SoundCloud, artwork) are
   blocked, so this checks our DOM only and runs offline. That
   YouTube/SoundCloud actually respond (volume, playback) is a
   manual check — see test/README.md.

       node player.test.js
   ============================================================ */

const { chromium } = require('playwright');
const { target } = require('./serve');

let fails = 0;
const check = (label, cond, extra = '') => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? '  ' + extra : '')); }
    else console.log('ok    ' + label);
};

(async () => {
    const { base, close } = await target(process.argv[2]);
    const origin = new URL(base).origin;

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.route('**/*', route =>
        route.request().url().startsWith(origin) ? route.continue() : route.abort());

    await page.goto(base, { waitUntil: 'load' });
    await page.waitForSelector('.gx-player .songs .song');

    const rows = page.locator('.gx-player .songs .song');
    const state = () => page.evaluate(() => ({
        iframes: [...document.querySelectorAll('.gx-player iframe')].map(f => f.src),
        visible: [...document.querySelectorAll('.gx-player .frame-box')].filter(b => !b.hidden).length,
        open: document.querySelector('.song-modal').classList.contains('active'),
        expanded: [...document.querySelectorAll('.gx-player .songs .song')]
            .map((b, i) => (b.getAttribute('aria-expanded') === 'true' ? i : -1)).filter(i => i >= 0),
        title: document.querySelector('.gx-player .title').textContent,
        focus: document.activeElement?.className || '',
    }));
    const settle = () => page.waitForTimeout(700);

    // --- at rest ----------------------------------------------------------
    let s = await state();
    check('12 rows rendered', (await rows.count()) === 12);
    check('no iframes on load', s.iframes.length === 0, `got ${s.iframes.length}`);
    check('modal closed on load', !s.open);
    check('newest release selected on load', s.title === 'reasons', s.title);

    // --- open one ---------------------------------------------------------
    await rows.nth(1).click();
    await settle();
    s = await state();
    check('row 2 opens the modal', s.open);
    check('exactly 1 iframe after first open', s.iframes.length === 1, `got ${s.iframes.length}`);
    check('it is the Expressions YouTube embed', /youtube\.com\/embed\/dd2-Gkox3f0/.test(s.iframes[0] || ''));
    check('row 2 aria-expanded, no other', s.expanded.join() === '1', s.expanded.join());
    check('selection follows the opened row', s.title === 'Expressions', s.title);
    check('focus moves to the close button', /\bclose\b/.test(s.focus), s.focus);

    // --- the dial ---------------------------------------------------------
    const dial = page.locator('.gx-player [role="slider"]');
    check('volume dial is a labelled slider', (await dial.getAttribute('aria-label')) === 'Volume');
    await dial.focus();
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(150);
    check('arrow key lowers the volume', (await dial.getAttribute('aria-valuenow')) === '99',
        await dial.getAttribute('aria-valuenow'));

    // --- Escape closes, focus returns, iframe survives ------------------
    await page.keyboard.press('Escape');
    await settle();
    s = await state();
    check('Escape closes the modal', !s.open);
    check('focus returns to the row', /\bsong\b/.test(s.focus), s.focus);
    check('iframe kept alive after close (preserves playhead)', s.iframes.length === 1);
    check('no row aria-expanded after close', s.expanded.length === 0);

    // --- a second release -------------------------------------------------
    await rows.nth(5).click();
    await settle();
    s = await state();
    check('2 iframes after opening a second release', s.iframes.length === 2, `got ${s.iframes.length}`);
    check('only the open release is visible', s.visible === 1, `got ${s.visible}`);
    check('soundcloud uses the visual player', s.iframes.some(src => /w\.soundcloud\.com.*visual=true/.test(src)));
    const permalink = page.locator('.gx-player .permalink');
    check('permalink is absolute with rel=noopener',
        /^https:\/\/soundcloud\.com\/gxmby\/discretion$/.test(await permalink.getAttribute('href')) &&
        (await permalink.getAttribute('rel')).includes('noopener'));
    await page.locator('.gx-player .close').click();
    await settle();

    // --- reopening does not remount -------------------------------------
    await rows.nth(1).click();
    await settle();
    s = await state();
    check('reopening reuses the existing iframe', s.iframes.length === 2, `got ${s.iframes.length}`);
    await page.locator('.gx-player .close').click();
    await settle();

    // --- Shorts are 9:16 -------------------------------------------------
    await rows.nth(2).click();
    await settle();
    check('shorts get the 9:16 frame', (await page.locator('.gx-player .frame-box--short:not([hidden])').count()) === 1);
    await page.locator('.gx-player .close').click();

    // --- race: open + close back to back ---------------------------------
    await rows.nth(7).click();
    await page.locator('.gx-player .close').click();
    await settle();
    s = await state();
    check('immediate open+close leaves the modal closed', !s.open);

    // --- the main list is inert while a modal is open --------------------
    await rows.nth(1).click();
    await settle();
    check('list is inert behind an open modal',
        await page.evaluate(() => document.querySelector('.gx-player .main-content').inert === true));
    await page.keyboard.press('Escape');
    await settle();

    // --- artist modal -----------------------------------------------------
    const toggle = page.locator('.gx-player .toggle');
    check('artist toggle starts collapsed', (await toggle.getAttribute('aria-expanded')) === 'false');
    await toggle.click();
    await settle();
    check('artist toggle expands', (await toggle.getAttribute('aria-expanded')) === 'true');
    check('artist modal has the bio', /\S/.test(await page.locator('.gx-player .bio').textContent()));
    check('artist panel links all four platforms',
        (await page.locator('.gx-player .links a[href^="https://"][rel*="noopener"]').count()) === 4);
    await page.keyboard.press('Escape');
    await settle();
    check('Escape closes the artist modal', (await toggle.getAttribute('aria-expanded')) === 'false');

    check('no page errors', errs.length === 0, errs.join('; '));

    await browser.close();
    close();
    console.log(fails ? `\n${fails} FAILURE(S)` : '\nAll checks passed');
    process.exit(fails ? 1 : 0);
})();
