/* ============================================================
   SocialLink.jsx
   A footer link drawn by WarpText. Mounted inside the real <a>
   (which keeps href, aria-label and focus), so this only sizes
   a box and draws the label.

   WarpText shrinks its text to fit the box. Equal-width boxes
   would draw "x" huge and "soundcloud" tiny, so each box is
   measured from its own text: every label then renders at the
   same size. Idle links don't animate (WarpText hoverOnly).
   ============================================================ */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import WarpText from '../WarpText/WarpText';
import { usePalette } from '../../theme';

const FAMILY = 'OpenSauceSans';
const WEIGHT = 800;
const SPACING = -0.03; // em

const phone = window.matchMedia('(max-width: 767px)');
const subscribe = cb => {
    phone.addEventListener('change', cb);
    return () => phone.removeEventListener('change', cb);
};
const usePhone = () => useSyncExternalStore(subscribe, () => phone.matches);

let probe = null;
function measure(text, size) {
    probe ??= document.createElement('canvas').getContext('2d');
    probe.font = `${WEIGHT} ${size}px ${FAMILY}`;
    const chars = Array.from(text).length;
    return probe.measureText(text).width + Math.max(0, chars - 1) * SPACING * size;
}

export default function SocialLink({ label }) {
    const p = usePalette();
    const size = usePhone() ? 24 : 32;
    // Measure once the face is loaded; a fallback font measures wrong.
    const [fontReady, setFontReady] = useState(false);
    // Keyboard focus on the link animates it like a hover would.
    const boxRef = useRef(null);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        const link = boxRef.current?.closest('a');
        if (!link) return undefined;
        const on = () => setFocused(link.matches(':focus-visible'));
        const off = () => setFocused(false);
        link.addEventListener('focus', on);
        link.addEventListener('blur', off);
        return () => {
            link.removeEventListener('focus', on);
            link.removeEventListener('blur', off);
        };
    }, []);

    useEffect(() => {
        let live = true;
        const done = () => live && setFontReady(true);
        (document.fonts?.load(`${WEIGHT} ${size}px ${FAMILY}`, label) ?? Promise.resolve()).then(done, done);
        return () => {
            live = false;
        };
    }, [label, size]);

    // WarpText fits text to 86% of the width and 78% of the height; a
    // little extra width leaves room for the lens to bulge the edges.
    const width = Math.ceil(measure(label, size) / 0.8) + 8;
    const height = Math.ceil(size * 1.9);

    return (
        <span ref={boxRef} className="social-link__box" style={{ width, height }} data-ready={fontReady || undefined}>
            <WarpText
                key={fontReady ? 'ready' : 'pending'}
                {...p.warp}
                text={label}
                warpStrength={0.12}
                warpScale={1.9}
                speed={0.55}
                pointerInfluence={0.33}
                pointerStrength={0.48}
                refraction={0.03}
                ripple
                hoverOnly
                engaged={focused}
                fontSize={size}
                fontWeight={WEIGHT}
                fontFamily={FAMILY}
                letterSpacing={`${SPACING}em`}
                style={{ width: '100%', height: '100%', minHeight: 0 }}
            />
        </span>
    );
}
