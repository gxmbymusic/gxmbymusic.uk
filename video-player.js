(function() {
    const videoEmbed = document.querySelector('.video-embed');
    const iframe = document.getElementById('heroVideo');
    const audioPlayer = document.getElementById('audioPlayer');

    if (!videoEmbed || !iframe || !audioPlayer) return;

    let player;
    let apiReady = false;
    let syncInterval = null;
    let pendingStart = false;
    let lastPlayerState = 'uninitialized';
    const debugPanel = document.getElementById('debugPanel');

    function setVideoState(isActive) {
        videoEmbed.classList.toggle('is-active', isActive);
        document.body.classList.toggle('video-active', isActive);
    }

    function renderDebug() {
        if (!debugPanel) return;

        const reactiveState = window.GXMBYReactive && typeof window.GXMBYReactive.getDebugState === 'function'
            ? window.GXMBYReactive.getDebugState()
            : null;

        const lines = [
            `yt: ${lastPlayerState}`,
            `video-active: ${videoEmbed.classList.contains('is-active')}`,
            `started: ${videoEmbed.classList.contains('is-started')}`,
            `audio-readyState: ${audioPlayer.readyState}`,
            `audio-paused: ${audioPlayer.paused}`,
            `audio-time: ${Number(audioPlayer.currentTime || 0).toFixed(2)}`
        ];

        if (reactiveState) {
            lines.push(`ctx: ${reactiveState.audioContextState}`);
            lines.push(`reactive-init: ${reactiveState.initialized}`);
            lines.push(`anim-loop: ${reactiveState.animationStarted}`);
            lines.push(`rms: ${reactiveState.rms}`);
            lines.push(`bass: ${reactiveState.bass}`);
            lines.push(`kick: ${reactiveState.kick}`);
            lines.push(`mid: ${reactiveState.mid}`);
            lines.push(`treble: ${reactiveState.treble}`);
            lines.push(`transient: ${reactiveState.transient}`);
        } else {
            lines.push('reactive: unavailable');
        }

        debugPanel.textContent = lines.join('\n');
    }

    function markStarted() {
        videoEmbed.classList.add('is-started');
    }

    function clearStarted() {
        videoEmbed.classList.remove('is-started');
    }

    function clearSyncInterval() {
        if (syncInterval) {
            window.clearInterval(syncInterval);
            syncInterval = null;
        }
    }

    function syncAudioToVideo(force = false) {
        if (!player || typeof player.getCurrentTime !== 'function' || audioPlayer.readyState === 0) {
            return;
        }

        const videoTime = player.getCurrentTime();
        if (!Number.isFinite(videoTime)) return;

        const drift = Math.abs(audioPlayer.currentTime - videoTime);
        if (force || drift > 0.3) {
            const maxTime = Number.isFinite(audioPlayer.duration) ? audioPlayer.duration : videoTime;
            const targetTime = Math.max(0, Math.min(videoTime, maxTime));
            if (Math.abs(audioPlayer.currentTime - targetTime) > 0.05) {
                audioPlayer.currentTime = targetTime;
            }
        }
    }

    async function playReactiveAudio() {
        if (window.GXMBYReactive && typeof window.GXMBYReactive.start === 'function') {
            await window.GXMBYReactive.start();
        }

        syncAudioToVideo(true);
        try {
            await audioPlayer.play();
        } catch (error) {
            console.warn('Hidden reactive audio failed to play:', error);
        }
    }

    function pauseReactiveAudio() {
        audioPlayer.pause();
        clearSyncInterval();

        if (window.GXMBYReactive && typeof window.GXMBYReactive.pause === 'function') {
            window.GXMBYReactive.pause();
        }
    }

    function startSyncLoop() {
        clearSyncInterval();
        syncInterval = window.setInterval(() => {
            syncAudioToVideo(false);
        }, 350);
    }

    async function startExperience() {
        if (!player || typeof player.playVideo !== 'function') {
            pendingStart = true;
            return;
        }

        pendingStart = false;
        markStarted();
        setVideoState(true);
        await playReactiveAudio();
        startSyncLoop();
        player.playVideo();
    }

    function loadYouTubeApi() {
        if (window.YT && typeof window.YT.Player === 'function') {
            onYouTubeIframeAPIReady();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function() {
        if (typeof previousReady === 'function') {
            previousReady();
        }

        if (apiReady) return;
        apiReady = true;

        player = new window.YT.Player('heroVideo', {
            events: {
                onReady: () => {
                    if (pendingStart) {
                        startExperience();
                    }
                },
                onStateChange: ({ data }) => {
                    lastPlayerState = String(data);
                    if (data === window.YT.PlayerState.PLAYING) {
                        setVideoState(true);
                        playReactiveAudio();
                        startSyncLoop();
                        return;
                    }

                    if (data === window.YT.PlayerState.BUFFERING) {
                        setVideoState(true);
                        syncAudioToVideo(true);
                        return;
                    }

                    setVideoState(false);
                    pauseReactiveAudio();

                    if (data === window.YT.PlayerState.PAUSED || data === window.YT.PlayerState.CUED) {
                        syncAudioToVideo(true);
                    }

                    if (data === window.YT.PlayerState.ENDED) {
                        audioPlayer.currentTime = 0;
                        clearStarted();
                    }
                }
            }
        });
    };

    videoEmbed.addEventListener('pointerdown', () => {
        if (!videoEmbed.classList.contains('is-started')) {
            startExperience();
        }
    }, { capture: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            setVideoState(false);
            pauseReactiveAudio();
            clearStarted();
        }
    });

    window.addEventListener('beforeunload', clearSyncInterval);
    window.setInterval(renderDebug, 200);
    renderDebug();

    loadYouTubeApi();
})();
