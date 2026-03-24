/* ============================================================
   video-player.js
   YouTube IFrame API bridge.
   Tells GXMBYEngine when playback starts/stops/seeks so the
   hidden audio element can be kept in sync for Web Audio
   analysis.
   ============================================================ */

(function () {
    const videoEmbed = document.getElementById('videoEmbed');
    const iframe     = document.getElementById('heroVideo');

    if (!videoEmbed || !iframe) return;

    let player        = null;
    let apiReady      = false;
    let syncInterval  = null;

    // ── Visual state ──────────────────────────────────────────
    function setActive(active) {
        videoEmbed.classList.toggle('is-active', active);
        document.body.classList.toggle('video-active', active);
    }

    // ── Sync loop ─────────────────────────────────────────────
    // Periodically re-sync currentTime so any clock drift is corrected
    function startSync() {
        stopSync();
        syncInterval = setInterval(() => {
            if (!player || typeof player.getCurrentTime !== 'function') return;
            const ct = player.getCurrentTime();
            if (window.GXMBYEngine) {
                window.GXMBYEngine.setPlayback({ playing: true, currentTime: ct });
            }
        }, 2000); // re-sync every 2 s — audio analysis is real-time so this just corrects drift
    }

    function stopSync() {
        if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
    }

    // ── YT player state handler ───────────────────────────────
    function onStateChange({ data }) {
        const YT = window.YT.PlayerState;

        if (data === YT.PLAYING) {
            setActive(true);
            const ct = player.getCurrentTime();
            if (window.GXMBYEngine) window.GXMBYEngine.setPlayback({ playing: true,  currentTime: ct });
            startSync();
            return;
        }

        if (data === YT.BUFFERING) {
            setActive(true);
            return;
        }

        // Paused / ended / cued
        setActive(false);
        stopSync();
        if (window.GXMBYEngine) {
            const ct = player && typeof player.getCurrentTime === 'function'
                ? player.getCurrentTime() : 0;
            window.GXMBYEngine.setPlayback({ playing: false, currentTime: ct });
        }
    }

    // ── YT API bootstrap ──────────────────────────────────────
    function initPlayer() {
        if (apiReady) return;
        apiReady = true;

        player = new window.YT.Player('heroVideo', {
            events: { onStateChange }
        });
    }

    // Chain onto any existing onYouTubeIframeAPIReady
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
        if (typeof prev === 'function') prev();
        initPlayer();
    };

    // Load YT API script if not already present
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s   = document.createElement('script');
        s.src     = 'https://www.youtube.com/iframe_api';
        s.async   = true;
        document.head.appendChild(s);
    } else if (window.YT && window.YT.Player) {
        // API already loaded (e.g. hot reload)
        initPlayer();
    }

    // ── Page visibility ───────────────────────────────────────
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            setActive(false);
            stopSync();
            if (window.GXMBYEngine) window.GXMBYEngine.setPlayback({ playing: false, currentTime: 0 });
        }
    });

    window.addEventListener('beforeunload', stopSync);

})();
