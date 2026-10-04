## Integrate the <DepthText /> component from React Bits

You are helping integrate an open-source React component into an existing application.

### Component: DepthText
### Variant: JavaScript + CSS


---

### Usage Example
```jsx
import DepthText from './DepthText';

<DepthText
  text="GXMBY "
  layers={13}
  depth={4}
  faceColor="#f8fafc"
  depthColor="#3B82F6"
  tilt={7.5}
  pointerTracking
  smoothing={0.19}
  perspective={900}
  autoOrbit
  orbitSpeed={0.45}
  fontSize="clamp(3.5rem, 15vw, 8.5rem)"
  fontWeight={900}
  shadow
/>
```

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| text | string | "Elevate" | The word or short phrase rendered as extruded type. |
| layers | number | 34 | Number of stacked copies that form the extrusion. Clamped to protect the DOM. |
| depth | number | 2.4 | Spacing in pixels between each layer of the extrusion. |
| faceColor | string | "#f8fafc" | Color of the crisp front face of the text. |
| depthColor | string | "#7c3aed" | Tint used for the back of the extrusion and its shadow. |
| tilt | number | 7.5 | Maximum pointer-driven rotation in degrees. |
| pointerTracking | boolean | true | Enables smoothed pointer parallax on fine pointer devices. |
| smoothing | number | 0.14 | Damping amount used to ease rotation toward the pointer target. |
| perspective | number | 900 | Perspective distance in pixels for the 3D stack. |
| autoOrbit | boolean | true | Adds a subtle orbit when pointer tracking is unavailable or idle. |
| orbitSpeed | number | 0.35 | Speed of the fallback orbit in cycles per second. |
| fontSize | string | "clamp(3rem, 12vw, 7rem)" | CSS font-size value for the display word. |
| fontWeight | number | string | 900 | Font weight used for every layer. |
| shadow | boolean | true | Adds a soft colored drop shadow to the front face. |
| className | string | "" | Optional class name for the outer wrapper. |
| style | CSSProperties | {} | Optional inline styles for the outer wrapper. |

### Full Component Source
```jsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import './DepthText.css';

const MAX_LAYERS = 64;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getLayerColor = (faceColor, depthColor, index, total) => {
  const progress = total <= 1 ? 1 : index / total;
  const eased = progress * progress;
  const faceMix = Math.round((1 - eased) * 72 + 4);
  return `color-mix(in srgb, ${faceColor} ${faceMix}%, ${depthColor})`;
};

const getTransform = (rotateX, rotateY) => `rotateX(${rotateX.toFixed(3)}deg) rotateY(${rotateY.toFixed(3)}deg)`;

const DepthText = ({
  text = 'Elevate',
  layers = 34,
  depth = 2.4,
  faceColor = '#f8fafc',
  depthColor = '#7c3aed',
  tilt = 7.5,
  pointerTracking = true,
  smoothing = 0.14,
  perspective = 900,
  autoOrbit = true,
  orbitSpeed = 0.35,
  fontSize = 'clamp(3rem, 12vw, 7rem)',
  fontWeight = 900,
  shadow = true,
  className = '',
  style = {}
}) => {
  const rootRef = useRef(null);
  const stageRef = useRef(null);

  const safeLayers = clamp(Math.round(Number(layers) || 1), 2, MAX_LAYERS);
  const safeDepth = clamp(Number(depth) || 0, 0, 12);
  const safeTilt = clamp(Number(tilt) || 0, 0, 12);
  const safeSmoothing = clamp(Number(smoothing) || 0.14, 0.02, 0.35);
  const safePerspective = clamp(Number(perspective) || 900, 300, 2000);
  const safeOrbitSpeed = clamp(Number(orbitSpeed) || 0, 0, 2);

  const baseRotation = useMemo(() => ({ x: -safeTilt * 0.32, y: safeTilt * 0.42 }), [safeTilt]);

  const depthLayers = useMemo(
    () =>
      Array.from({ length: safeLayers }, (_, layerIndex) => {
        const index = safeLayers - layerIndex;
        return {
          index,
          color: getLayerColor(faceColor, depthColor, index, safeLayers),
          transform: `translateZ(${-index * safeDepth}px)`
        };
      }),
    [safeLayers, safeDepth, faceColor, depthColor]
  );

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage || typeof window === 'undefined') return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const canTrackPointer = pointerTracking && finePointer && !reducedMotion;

    let frameId = 0;
    let activePointer = false;
    let startTime = performance.now();
    const current = { ...baseRotation };
    const target = { ...baseRotation };

    const applyTransform = () => {
      stage.style.transform = getTransform(current.x, current.y);
    };

    if (reducedMotion) {
      stage.style.transform = getTransform(baseRotation.x, baseRotation.y);
      return undefined;
    }

    const handlePointerMove = event => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      activePointer = true;
      const x = clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.8), -1, 1);
      const y = clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height * 0.8), -1, 1);

      target.x = baseRotation.x - y * safeTilt;
      target.y = baseRotation.y + x * safeTilt;
    };

    const handlePointerLeave = () => {
      activePointer = false;
      target.x = baseRotation.x;
      target.y = baseRotation.y;
    };

    if (canTrackPointer) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerleave', handlePointerLeave);
      window.addEventListener('blur', handlePointerLeave);
    }

    const tick = now => {
      if ((!canTrackPointer || !activePointer) && autoOrbit) {
        const elapsed = (now - startTime) / 1000;
        const orbit = elapsed * safeOrbitSpeed * Math.PI * 2;
        const fallbackAmount = canTrackPointer ? 0.18 : 0.55;
        target.x = baseRotation.x + Math.sin(orbit) * safeTilt * fallbackAmount;
        target.y = baseRotation.y + Math.cos(orbit * 0.85) * safeTilt * fallbackAmount;
      }

      current.x += (target.x - current.x) * safeSmoothing;
      current.y += (target.y - current.y) * safeSmoothing;
      applyTransform();
      frameId = requestAnimationFrame(tick);
    };

    applyTransform();
    frameId = requestAnimationFrame(tick);

    return () => {
      if (canTrackPointer) {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerleave', handlePointerLeave);
        window.removeEventListener('blur', handlePointerLeave);
      }
      cancelAnimationFrame(frameId);
      startTime = 0;
    };
  }, [autoOrbit, baseRotation, pointerTracking, safeOrbitSpeed, safeSmoothing, safeTilt]);

  const rootStyle = {
    ...style,
    '--depth-text-perspective': `${safePerspective}px`,
    '--depth-text-font-size': fontSize,
    '--depth-text-font-weight': fontWeight,
    '--depth-text-face-color': faceColor,
    '--depth-text-depth-color': depthColor,
    '--depth-text-shadow': shadow
      ? `0 22px 34px color-mix(in srgb, ${depthColor} 36%, transparent), 0 4px 8px rgba(0, 0, 0, 0.28)`
      : 'none'
  };

  return (
    <span ref={rootRef} className={`depth-text ${className}`.trim()} style={rootStyle}>
      <span ref={stageRef} className="depth-text__stage">
        {depthLayers.map(layer => (
          <span
            aria-hidden="true"
            className="depth-text__layer"
            key={layer.index}
            style={{ color: layer.color, transform: layer.transform }}
          >
            {text}
          </span>
        ))}
        <span className="depth-text__face">{text}</span>
      </span>
    </span>
  );
};

export default DepthText;

```

### Component CSS
```css
.depth-text {
  display: inline-block;
  perspective: var(--depth-text-perspective);
  perspective-origin: 50% 48%;
  isolation: isolate;
}

.depth-text__stage {
  position: relative;
  display: inline-grid;
  place-items: center;
  transform-style: preserve-3d;
  transform: rotateX(-2.4deg) rotateY(3.15deg);
  transform-origin: 50% 50%;
  will-change: transform;
}

.depth-text__layer,
.depth-text__face {
  grid-area: 1 / 1;
  display: inline-block;
  font-size: var(--depth-text-font-size);
  font-weight: var(--depth-text-font-weight);
  line-height: 0.86;
  letter-spacing: -0.065em;
  white-space: nowrap;
  user-select: none;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  font-kerning: normal;
  text-rendering: geometricPrecision;
}

.depth-text__layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  filter: saturate(0.95) brightness(0.92);
  pointer-events: none;
}

.depth-text__face {
  position: relative;
  z-index: 1;
  color: var(--depth-text-face-color);
  text-shadow: var(--depth-text-shadow);
  transform: translateZ(0.6px);
}

@media (hover: hover) and (pointer: fine) {
  .depth-text {
    cursor: default;
  }
}

@media (prefers-reduced-motion: reduce) {
  .depth-text__stage {
    will-change: auto;
  }
}

```

### Integration Instructions
1. Install any listed dependencies.
2. Copy the component source into the appropriate directory in the project.
3. Import the CSS file alongside the component.
4. Import and render the component using the usage example above as a starting point.
5. Adjust props as needed for the specific use case — refer to the props table for all available options.

### More from React Bits
The full library index, including everything reactbits.dev offers, is at https://reactbits.dev/llms.txt — fetch it if this component is not the right fit or the project needs more pieces.
