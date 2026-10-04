/* ============================================================
   islands.jsx
   Mounts React components into slots that already exist in
   index.html. The page itself stays static HTML; the vanilla
   scripts in public/ (engine.js …) load first as classic
   scripts, and this module runs after them (modules defer).

   Each entry is [selector, Component]. A missing slot is
   skipped, so an island can be removed from the HTML without
   touching this file. Placement and props: react-bits/PLAN.md.
   Colours that change with the theme come from src/theme.js.
   ============================================================ */

import { createRoot } from 'react-dom/client';

import { HERO_IMAGE } from './config';
import { usePalette } from './theme';
import MoltenMetal from './components/MoltenMetal/MoltenMetal';
import DitherVeil from './components/DitherVeil/DitherVeil';
import DepthText from './components/DepthText/DepthText';
import MusicPlayer from './components/MusicPlayer/MusicPlayer';

// Read once: the components that honour it do so internally too,
// these props cover the ones that don't.
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Full-page background. Audio lift comes from GXMBYEngine.level().
function Background() {
    const p = usePalette();
    return (
        <MoltenMetal
            {...p.molten}
            backgroundColor={p.bg}
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
        />
    );
}

// Hero image: dithered, revealed in colour around the cursor.
function HeroVeil() {
    const p = usePalette();
    return (
        <DitherVeil
            {...p.veil}
            src={HERO_IMAGE}
            pattern="bayer"
            pixelSize={1}
            revealRadius={70}
            softness={0.55}
            linger={1.2}
            fit="cover"
            palette="rgb"
            contrast={1.3}
            brightness={0.14}
            wander
        />
    );
}

// The one GXMBY. Sized by its h1 (style.css) so engine.js's echoes,
// which read the h1's font-size, match it exactly.
function Wordmark() {
    const p = usePalette();
    return (
        <DepthText
            {...p.depth}
            text="GXMBY"
            layers={13}
            depth={4}
            tilt={7.5}
            pointerTracking
            smoothing={0.19}
            perspective={900}
            autoOrbit
            orbitSpeed={0.45}
            fontSize="1em"
            fontWeight={900}
            shadow
        />
    );
}

const ISLANDS = [
    ['#bg', Background],
    ['#heroVeil', HeroVeil],
    ['#mainText', Wordmark],
    // Release browser: replaces the accordion (media.js, now _retired/)
    ['#player', MusicPlayer]
];

for (const [selector, Island] of ISLANDS) {
    document.querySelectorAll(selector).forEach(el => createRoot(el).render(<Island />));
}
