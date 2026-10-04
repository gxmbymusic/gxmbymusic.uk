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
import TechText from './components/TechText/TechText';
import SocialLink from './components/SocialLink/SocialLink';

// Canvas/WebGL text only waits for fonts the page has already asked
// for; request these weights up front so TechText and WarpText don't
// rasterise in a fallback face.
document.fonts?.load('900 64px OpenSauceSans', 'RELEASES');
document.fonts?.load('800 64px OpenSauceSans');

// Read once: the components that honour it do so internally too,
// these props cover the ones that don't.
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Touch screens have no hover, so a wandering reveal would redraw the
// hero every frame forever. There it plays its intro, then sleeps
// until tapped (taps still send the colour ripple).
const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

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
            wander={finePointer}
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

// Section title. Mounted inside the h2, whose accessible name then
// comes from TechText's role="img" aria-label. Height is tied to the
// viewport so the first release stays above the fold (layout.test.js).
function ReleasesTitle() {
    const p = usePalette();
    return (
        <TechText
            text="RELEASES"
            fontFamily="OpenSauceSans"
            fontWeight={900}
            fontSize={180}
            letterSpacing={0.11}
            color={p.tech.color}
            accentColor={p.tech.accent}
            reveal="letter"
            dashLength={10}
            dashGap={2}
            strokeWidth={2.75}
            specks={15}
            speed={1.6}
            style={{ height: 'clamp(64px, min(14vw, 12svh), 140px)' }}
        />
    );
}

// Footer links: the <a> stays real; WarpText draws its label.
const FooterLink = ({ el }) => <SocialLink label={el.dataset.tech} />;

const ISLANDS = [
    ['#bg', Background],
    ['#heroVeil', HeroVeil],
    ['#mainText', Wordmark],
    // Release browser: replaces the accordion (media.js, now _retired/)
    ['#player', MusicPlayer],
    ['#releasesTitle', ReleasesTitle],
    ['.social-links a[data-tech]', FooterLink]
];

for (const [selector, Island] of ISLANDS) {
    document.querySelectorAll(selector).forEach(el => createRoot(el).render(<Island el={el} />));
}
