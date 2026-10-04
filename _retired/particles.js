/* ============================================================
   particles.js
   Lightweight particle field. Exposes window.Particles so the
   main engine can drive it from the shared rAF loop.
   ============================================================ */

(function () {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });

    // ── Config ──────────────────────────────────────────────
    const COUNT          = 55;
    const CONNECT_DIST   = 140;
    const CONNECT_DIST_SQ= CONNECT_DIST * CONNECT_DIST;
    const GRAB_DIST_SQ   = 180 * 180;
    const ATTRACT_F      = 0.045;
    const SPEED_BOOST    = 0.08;
    const MAX_SPEED      = 4.5;
    const BASE_OPACITY   = 0.38;
    const FRICTION       = 0.965;

    // ── State ────────────────────────────────────────────────
    const mouse = { x: null, y: null };
    const particles = [];

    // energy passed in from audio engine each frame (0–1)
    let _energy = 0;

    // ── Resize ───────────────────────────────────────────────
    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Mouse ────────────────────────────────────────────────
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

    canvas.addEventListener('click', e => {
        for (let i = 0; i < 3; i++) particles.push(new Particle(e.clientX, e.clientY));
        if (particles.length > COUNT + 15) particles.splice(0, 3);
    });

    // ── Particle ─────────────────────────────────────────────
    class Particle {
        constructor(x, y) {
            this.x  = x  ?? Math.random() * canvas.width;
            this.y  = y  ?? Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 3;
            this.vy = (Math.random() - 0.5) * 1.5;
            this.r  = Math.random() * 1.4 + 0.5;
        }

        update(energy) {
            // Mouse interaction
            if (mouse.x !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dSq = dx * dx + dy * dy;
                if (dSq < GRAB_DIST_SQ) {
                    const d = Math.sqrt(dSq);
                    this.vx += (dx / d) * ATTRACT_F;
                    this.vy += (dy / d) * ATTRACT_F;
                    this.vx += (Math.random() - 0.5) * SPEED_BOOST;
                    this.vy += (Math.random() - 0.5) * SPEED_BOOST;
                }
            }

            // Audio energy nudge — particles get restless on loud moments
            if (energy > 0.55) {
                this.vx += (Math.random() - 0.5) * SPEED_BOOST * energy;
                this.vy += (Math.random() - 0.5) * SPEED_BOOST * energy;
            }

            this.vx *= FRICTION;
            this.vy *= FRICTION;

            // Cap speed
            const spd = this.vx * this.vx + this.vy * this.vy;
            if (spd > MAX_SPEED * MAX_SPEED) {
                const inv = MAX_SPEED / Math.sqrt(spd);
                this.vx *= inv;
                this.vy *= inv;
            }

            this.x += this.vx;
            this.y += this.vy;

            // Bounce
            if (this.x <= 0 || this.x >= canvas.width)  { this.vx *= -1; this.x = Math.max(0, Math.min(canvas.width,  this.x)); }
            if (this.y <= 0 || this.y >= canvas.height) { this.vy *= -1; this.y = Math.max(0, Math.min(canvas.height, this.y)); }
        }
    }

    // ── Init ─────────────────────────────────────────────────
    for (let i = 0; i < COUNT; i++) particles.push(new Particle());

    // ── Draw (called from engine) ─────────────────────────────
    function draw(energy) {
        _energy = energy;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update all particles
        for (let i = 0; i < particles.length; i++) particles[i].update(energy);

        // Draw connections — use squared distance to avoid sqrt in hot path
        ctx.lineWidth = 0.7;
        for (let i = 0; i < particles.length; i++) {
            const pi = particles[i];
            for (let j = i + 1; j < particles.length; j++) {
                const pj = particles[j];
                const dx = pi.x - pj.x;
                const dy = pi.y - pj.y;
                const dSq = dx * dx + dy * dy;
                if (dSq >= CONNECT_DIST_SQ) continue;

                let alpha = (1 - dSq / CONNECT_DIST_SQ) * 0.28;

                // Boost near mouse
                if (mouse.x !== null) {
                    const mdi = (mouse.x - pi.x) ** 2 + (mouse.y - pi.y) ** 2;
                    const mdj = (mouse.x - pj.x) ** 2 + (mouse.y - pj.y) ** 2;
                    if (mdi < GRAB_DIST_SQ || mdj < GRAB_DIST_SQ) alpha = Math.min(alpha * 1.7, 0.5);
                }

                ctx.strokeStyle = `rgba(0,0,0,${alpha.toFixed(3)})`;
                ctx.beginPath();
                ctx.moveTo(pi.x, pi.y);
                ctx.lineTo(pj.x, pj.y);
                ctx.stroke();
            }
        }

        // Draw particles
        ctx.fillStyle = `rgba(0,0,0,${BASE_OPACITY})`;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Public API ───────────────────────────────────────────
    window.Particles = { draw };
})();
