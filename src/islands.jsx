/* ============================================================
   islands.jsx
   Mounts React components into slots that already exist in
   index.html. The page itself stays static HTML; the vanilla
   scripts in public/ (engine.js …) load first as classic
   scripts, and this module runs after them (modules defer).

   Each entry is [selector, render]. A missing slot is skipped,
   so an island can be removed from the HTML without touching
   this file. Placement and props: react-bits/PLAN.md.
   ============================================================ */

import { createRoot } from 'react-dom/client';

import MoltenMetal from './components/MoltenMetal/MoltenMetal';

// Read once: the components that honour it do so internally too,
// these props cover the ones that don't.
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const ISLANDS = [
    // Full-page background. Audio lift comes from GXMBYEngine.level().
    ['#bg', () => (
        <MoltenMetal
            color1="#5227FF"
            color2="#d3e45a"
            color3="#FFFFFF"
            speed={reducedMotion ? 0 : 0.35}
            scale={4}
            detail={3}
            glow={1.6}
            coreSize={0.16}
            swirl={1}
            fold={-0.2}
            blackPoint={0.13}
            brightness={1.3}
            colorMode="molten"
            grain={!reducedMotion}
            grainIntensity={0.05}
            mouseInteraction={!reducedMotion}
            mouseStrength={0.3}
            opacity={1.0}
        />
    )]
];

for (const [selector, render] of ISLANDS) {
    document.querySelectorAll(selector).forEach(el => createRoot(el).render(render(el)));
}
