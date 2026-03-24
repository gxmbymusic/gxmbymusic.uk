/* ============================================================
   engine.js
   Central animation engine. Owns the single rAF loop.

   Audio reactivity strategy:
   ─────────────────────────
   We play a hidden <audio> element (same track as the YouTube
   video) through the Web Audio API AnalyserNode. When the
   YouTube video plays, we start the hidden audio at the same
   timestamp and keep it muted — the browser analyses the
   waveform in real time, giving us reliable frequency data
   without any JSON pre-bake or polling lag.

   Ghost text strategy:
   ────────────────────
   Instead of DOM ghost layers, we draw expanding "echo" rings
   of "GXMBY" text on a dedicated canvas. Each transient peak
   spawns a new echo object that grows outward and fades — like
   a ripple from a stone hitting water. Up to MAX_ECHOES live
   simultaneously, driven by the transient detector.
   ============================================================ */

(function () {

    // ── Elements ─────────────────────────────────────────────
    const mainText   = document.getElementById('mainText');
    const ghostCanvas= document.getElementById('ghostCanvas');
    const syncAudio  = document.getElementById('syncAudio');

    if (!mainText || !ghostCanvas) return;

    const gCtx = ghostCanvas.getContext('2d');

    // ── Ghost canvas resize ───────────────────────────────────
    function resizeGhost() {
        ghostCanvas.width  = window.innerWidth;
        ghostCanvas.height = window.innerHeight;
    }
    resizeGhost();
    window.addEventListener('resize', resizeGhost);

    // ── Audio state ───────────────────────────────────────────
    let audioCtx    = null;
    let analyser    = null;
    let dataArray   = null;
    let sourceNode  = null;
    let audioReady  = false;

    // Smoothed values carried between frames
    let smoothEnergy    = 0;
    let smoothTransient = 0;
    let prevEnergy      = 0;
    let isPlaying       = false;
    let currentVideoTime= 0;

    function initAudio() {
        if (audioReady) return;
        try {
            audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
            analyser   = audioCtx.createAnalyser();
            analyser.fftSize            = 256;
            analyser.smoothingTimeConstant = 0.75;
            dataArray  = new Uint8Array(analyser.frequencyBinCount);

            // Route hidden audio through analyser but NOT to speakers
            sourceNode = audioCtx.createMediaElementSource(syncAudio);
            sourceNode.connect(analyser);
            // Intentionally NOT connecting analyser → audioCtx.destination
            // so it remains completely silent

            syncAudio.volume = 0; // belt-and-suspenders silence
            audioReady = true;
        } catch (e) {
            console.warn('Web Audio API unavailable:', e);
        }
    }

    // Called by video-player.js when YouTube state changes
    function setPlayback({ playing, currentTime }) {
        isPlaying       = playing;
        currentVideoTime= currentTime;

        if (!audioReady) initAudio();

        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

        if (playing) {
            // Seek hidden audio to match video then play
            try {
                syncAudio.currentTime = currentTime;
                syncAudio.play().catch(() => {});
            } catch (_) {}
        } else {
            syncAudio.pause();
        }
    }

    // Read analyser → return { energy, transient } in [0,1]
    function readAudio() {
        if (!audioReady || !isPlaying) {
            smoothEnergy    = smoothEnergy    * 0.88;
            smoothTransient = smoothTransient * 0.82;
            prevEnergy      = smoothEnergy;
            return { energy: smoothEnergy, transient: smoothTransient, peak: 0 };
        }

        analyser.getByteFrequencyData(dataArray);

        // RMS energy across all bins
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rawEnergy = Math.sqrt(sum / dataArray.length) / 255;

        // Transient = positive delta only (onset detection)
        const delta = Math.max(0, rawEnergy - prevEnergy);
        prevEnergy  = rawEnergy;

        smoothEnergy    = smoothEnergy    * 0.72 + rawEnergy * 0.28;
        smoothTransient = smoothTransient * 0.55 + delta     * 0.45;

        // Peak (loudest single bin, normalised)
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) if (dataArray[i] > peak) peak = dataArray[i];

        return {
            energy:    smoothEnergy,
            transient: Math.min(1, smoothTransient * 6),  // amplify for visibility
            peak:      peak / 255
        };
    }

    // ── Echo / ghost system ───────────────────────────────────
    const MAX_ECHOES   = 8;
    const echoes       = [];
    let   transientBudget = 0; // prevent spawning every frame on sustained loud passages

    function spawnEcho(energy) {
        if (echoes.length >= MAX_ECHOES) return;
        echoes.push({
            scale:   0.92 + Math.random() * 0.12,   // start near mainText size
            opacity: 0.28 + energy * 0.22,
            spread:  0,                              // how much bigger than mainText
            color:   randomEchoColor(),
            life:    1.0,                            // 1→0
            decay:   0.018 + Math.random() * 0.014  // speed of fade
        });
    }

    function randomEchoColor() {
        const palettes = [
            'rgba(255, 40,  90,',   // hot pink
            'rgba(80,  130, 255,',  // electric blue
            'rgba(160, 255, 80,',   // acid green
            'rgba(255, 190, 30,',   // amber
            'rgba(200, 80,  255,'   // purple
        ];
        return palettes[Math.floor(Math.random() * palettes.length)];
    }

    // Draw ghost echoes on the ghost canvas
    function drawEchoes() {
        gCtx.clearRect(0, 0, ghostCanvas.width, ghostCanvas.height);

        if (!mainText) return;

        // Get the rendered font size from the element so echoes match exactly
        const style    = window.getComputedStyle(mainText);
        const fontSize = parseFloat(style.fontSize);
        const cx       = ghostCanvas.width  / 2;
        const cy       = ghostCanvas.height / 2;

        for (let i = echoes.length - 1; i >= 0; i--) {
            const e = echoes[i];
            e.life   -= e.decay;
            e.spread += 1.6;   // expand outward each frame

            if (e.life <= 0) { echoes.splice(i, 1); continue; }

            const t       = 1 - e.life;              // 0 = just spawned, 1 = dead
            const scale   = e.scale + t * 0.55;      // grow as it fades
            const alpha   = e.opacity * e.life * e.life; // quadratic fade

            gCtx.save();
            gCtx.translate(cx, cy);
            gCtx.scale(scale, scale);
            gCtx.globalAlpha = alpha;
            gCtx.font        = `900 ${fontSize}px 'Arial Black', Arial, sans-serif`;
            gCtx.textAlign   = 'center';
            gCtx.textBaseline= 'middle';
            gCtx.letterSpacing = '-0.2em';
            gCtx.fillStyle   = `${e.color}1)`;
            gCtx.fillText('GXMBY', 0, 0);
            gCtx.restore();
        }
    }

    // ── Main text distortion ──────────────────────────────────
    function applyMainText(energy, transient, peak, active) {
        const a = active ? 1 : 0;

        // Idle drift — keeps things alive even when nothing plays
        const t    = performance.now() / 1000;
        const idle = (Math.sin(t * 0.7) + 1) / 2 * 0.3;

        const e = energy  + idle * (1 - a);
        const p = transient;

        const scale         = 1 + e * 0.09  + p * 0.07;
        const rotation      = (p - 0.5) * 3.5 * a;
        const skew          = (peak - 0.5)  * 5   * a;
        const glow          = 6  + e * 22  + p * 18;
        const brightness    = 1  + e * 0.14;
        const hue           = p  * 14 * a;
        const letterSpacing = -0.2 + e * 0.1 + p * 0.06;

        // Opacity: subtle reduction when audio is active, full when idle
        const opacity = active ? Math.max(0.12, 1 - e * 0.7) : 1;

        mainText.style.transform     = `scale(${scale}) rotate(${rotation}deg) skewX(${skew}deg)`;
        mainText.style.opacity       = opacity;
        mainText.style.filter        = `brightness(${brightness}) hue-rotate(${hue}deg)`;
        mainText.style.textShadow    = `0 0 ${glow}px rgba(0,0,0,0.22)`;
        mainText.style.letterSpacing = `${letterSpacing}em`;
    }

    // ── Unified rAF loop ──────────────────────────────────────
    function tick() {
        const { energy, transient, peak } = readAudio();

        // Spawn echo on strong transients (beat detection)
        transientBudget = Math.max(0, transientBudget - 0.025);
        if (transient > 0.42 && transientBudget <= 0) {
            spawnEcho(energy);
            transientBudget = 0.35; // minimum gap between spawns
        }

        // Drive particle system
        if (window.Particles) window.Particles.draw(energy);

        // Draw ghost echoes
        drawEchoes();

        // Distort main text
        applyMainText(energy, transient, peak, isPlaying);

        requestAnimationFrame(tick);
    }

    // ── Public API (used by video-player.js) ─────────────────
    window.GXMBYEngine = { setPlayback };

    // ── Kick off ─────────────────────────────────────────────
    tick();

})();
