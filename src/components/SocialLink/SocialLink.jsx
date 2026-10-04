/* ============================================================
   SocialLink.jsx
   A footer link drawn by TechText. Mounted inside the real <a>
   (which keeps href, aria-label and focus), so this only sizes
   a box and draws the label.

   TechText shrinks its text to fit the box. Equal-width boxes
   would draw "x" huge and "soundcloud" tiny, so each box is
   measured from its own text: every label then renders at the
   same size.
   ============================================================ */

import { useEffect, useState, useSyncExternalStore } from 'react';

import TechText from '../TechText/TechText';
import { usePalette } from '../../theme';

const FAMILY = 'OpenSauceSans';
const WEIGHT = 900;
const SPACING = 0.11; // em, as TechText's letterSpacing

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
    const size = usePhone() ? 22 : 28;
    // Measure once the face is loaded; a fallback font measures wrong.
    const [fontReady, setFontReady] = useState(false);

    useEffect(() => {
        let live = true;
        const done = () => live && setFontReady(true);
        (document.fonts?.load(`${WEIGHT} ${size}px ${FAMILY}`, label) ?? Promise.resolve()).then(done, done);
        return () => {
            live = false;
        };
    }, [label, size]);

    // TechText fits text to 90% of the width and 66% of the height.
    const width = Math.ceil(measure(label, size) / 0.88) + 4;
    const height = Math.ceil(size * 2.2);

    return (
        <span className="social-link__box" style={{ width, height }} data-ready={fontReady || undefined}>
            <TechText
                key={fontReady ? 'ready' : 'pending'}
                text={label}
                fontFamily={FAMILY}
                fontWeight={WEIGHT}
                fontSize={size}
                letterSpacing={SPACING}
                color={p.tech.color}
                accentColor={p.tech.accent}
                reveal="letter"
                dashLength={10}
                dashGap={2}
                strokeWidth={2.75}
                specks={15}
                speed={1.6}
                labels={false}
                draggable={false}
                sweep={false}
            />
        </span>
    );
}
