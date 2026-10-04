/* ============================================================
   theme.js
   Light / dark theme. Loaded blocking in <head> so data-theme
   is set before first paint (no flash of the wrong theme).

   - Follows the system preference until the visitor picks one
     with the toggle; the pick is remembered in localStorage.
   - The source of truth is <html data-theme="light|dark">.
     CSS keys off it, and React islands subscribe to it via
     src/theme.js (a MutationObserver on the attribute).
   - The toggle is #themeToggle in index.html; it is wired by
     delegation, so it works whenever the button appears.
   ============================================================ */

(function () {
    const KEY = 'gxmby-theme';
    const root = document.documentElement;
    const system = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)');

    // Storage can throw (private mode, blocked site data) — the
    // theme must still work, just without memory.
    function stored() {
        try {
            const v = localStorage.getItem(KEY);
            return v === 'light' || v === 'dark' ? v : null;
        } catch (e) {
            return null;
        }
    }

    function remember(theme) {
        try { localStorage.setItem(KEY, theme); } catch (e) { /* see stored() */ }
    }

    function apply(theme) {
        root.dataset.theme = theme;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = theme === 'light' ? '#ffffff' : '#0b0a0f';

        const btn = document.getElementById('themeToggle');
        if (btn) {
            const next = theme === 'light' ? 'dark' : 'light';
            btn.setAttribute('aria-label', `Switch to ${next} theme`);
            btn.title = `Switch to ${next} theme`;
        }
    }

    apply(stored() || (system && system.matches ? 'light' : 'dark'));

    // System changes only matter until the visitor has chosen.
    if (system && system.addEventListener) {
        system.addEventListener('change', e => {
            if (!stored()) apply(e.matches ? 'light' : 'dark');
        });
    }

    function toggle() {
        const next = root.dataset.theme === 'light' ? 'dark' : 'light';
        remember(next);
        apply(next);
    }

    document.addEventListener('click', e => {
        if (e.target.closest && e.target.closest('#themeToggle')) toggle();
    });

    // The button is parsed after this script runs; label it once it exists.
    document.addEventListener('DOMContentLoaded', () => apply(root.dataset.theme));

    window.GXMBYTheme = { get: () => root.dataset.theme, toggle };
})();
