/* ============================================================
   islands.jsx
   Mounts React components into slots that already exist in
   index.html. The page itself stays static HTML; the vanilla
   scripts in public/ (engine.js …) load first as classic
   scripts, and this module runs after them (modules defer).

   Each entry is [selector, render]. A missing slot is skipped,
   so an island can be removed from the HTML without touching
   this file. Islands arrive from step 2 of react-bits/PLAN.md.
   ============================================================ */

import { createRoot } from 'react-dom/client';

const ISLANDS = [];

for (const [selector, render] of ISLANDS) {
    document.querySelectorAll(selector).forEach(el => createRoot(el).render(render(el)));
}
