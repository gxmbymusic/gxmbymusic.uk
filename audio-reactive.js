(function() {
    const mainText = document.getElementById('mainText');

    if (!mainText) return;

    const ghostLayers = [];
    const NUM_GHOST_LAYERS = 5;
    const GHOST_COLORS = [
        'rgba(255, 50, 100, 0.34)',
        'rgba(100, 150, 255, 0.3)',
        'rgba(150, 255, 100, 0.26)',
        'rgba(255, 200, 50, 0.24)',
        'rgba(200, 100, 255, 0.22)'
    ];

    const state = {
        sequence: null,
        isPlaying: false,
        currentTime: 0,
        lastSyncTime: performance.now(),
        yOffset: 0
    };

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function createGhostLayers() {
        const container = mainText.parentElement;

        for (let i = 0; i < NUM_GHOST_LAYERS; i++) {
            const ghost = document.createElement('h1');
            ghost.className = 'ghost-text';
            ghost.textContent = mainText.textContent;

            ghost.style.color = GHOST_COLORS[i];
            ghost.style.zIndex = i + 1;
            ghost.style.textShadow = `0 0 14px ${GHOST_COLORS[i]}`;

            container.insertBefore(ghost, mainText);
            ghostLayers.push(ghost);
        }
    }

    function loadSequence() {
        return fetch('audio/Expressions-reactive.json')
            .then((response) => response.json())
            .then((data) => {
                state.sequence = data;
            })
            .catch((error) => {
                console.warn('Failed to load reactive timeline:', error);
            });
    }

    function setPlaybackState({ isPlaying, currentTime }) {
        state.isPlaying = Boolean(isPlaying);
        state.currentTime = Number.isFinite(currentTime) ? currentTime : state.currentTime;
        state.lastSyncTime = performance.now();
    }

    function getPlaybackTime() {
        if (!state.isPlaying) {
            return state.currentTime;
        }

        const elapsed = (performance.now() - state.lastSyncTime) / 1000;
        return state.currentTime + elapsed;
    }

    function sampleSequence(timeSeconds) {
        if (!state.sequence || !state.sequence.frames.length) {
            return { e: 0, p: 0, k: 0 };
        }

        const maxTime = state.sequence.duration || 0;
        const safeTime = clamp(timeSeconds, 0, maxTime);
        const framePosition = safeTime * state.sequence.fps;
        const baseIndex = Math.floor(framePosition);
        const nextIndex = Math.min(state.sequence.frames.length - 1, baseIndex + 1);
        const mix = framePosition - baseIndex;
        const current = state.sequence.frames[baseIndex] || state.sequence.frames[0];
        const next = state.sequence.frames[nextIndex] || current;

        return {
            e: lerp(current.e, next.e, mix),
            p: lerp(current.p, next.p, mix),
            k: lerp(current.k, next.k, mix)
        };
    }

    function applyFrame() {
        const time = getPlaybackTime();
        const frame = sampleSequence(time);
        const active = state.isPlaying ? 1 : 0;

        const targetYOffset = active ? lerp(state.yOffset, 96, 0.1) : lerp(state.yOffset, 0, 0.14);
        state.yOffset = targetYOffset;

        const scale = 1 + frame.e * 0.12 + frame.p * 0.08;
        const rotation = (frame.p - 0.5) * 4.5;
        const skew = (frame.k - 0.5) * 8;
        const glow = 8 + frame.e * 28 + frame.p * 22;
        const brightness = 1 + frame.e * 0.18;
        const hue = frame.p * 18;
        const letterSpacing = -0.2 + frame.e * 0.13 + frame.p * 0.08;
        const opacity = active ? 0.16 + frame.e * 0.18 : 1;

        mainText.style.transform = `translateY(${state.yOffset}px) scale(${scale}) rotate(${rotation}deg) skewX(${skew}deg)`;
        mainText.style.opacity = opacity;
        mainText.style.filter = `brightness(${brightness}) hue-rotate(${hue}deg)`;
        mainText.style.textShadow = `0 0 ${glow}px rgba(0, 0, 0, 0.28)`;
        mainText.style.letterSpacing = `${letterSpacing}em`;

        ghostLayers.forEach((ghost, index) => {
            const direction = index % 2 === 0 ? 1 : -1;
            const spread = (18 + index * 10) * frame.p;
            const lift = state.yOffset - frame.e * (10 + index * 6);
            const ghostScale = 1 + frame.e * (0.14 + index * 0.02) + frame.p * (0.2 + index * 0.03);
            const ghostOpacity = active ? frame.e * (0.2 - index * 0.025) + frame.p * (0.45 - index * 0.05) : 0;

            ghost.style.transform = `translate(-50%, -50%) translate(${spread * direction}px, ${lift}px) scale(${ghostScale})`;
            ghost.style.opacity = clamp(ghostOpacity, 0, 0.32);
        });

        requestAnimationFrame(applyFrame);
    }

    createGhostLayers();
    loadSequence();
    applyFrame();

    window.GXMBYTimeline = {
        setPlaybackState
    };
})();
