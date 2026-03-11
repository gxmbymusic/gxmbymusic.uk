(function() {
    const videoEmbed = document.querySelector('.video-embed');
    const iframe = document.getElementById('heroVideo');
    const audioPlayer = document.getElementById('audioPlayer');
    const playOverlay = document.querySelector('.video-play-overlay');

    if (!videoEmbed || !iframe || !audioPlayer || !playOverlay) return;

    let player;
    let apiReady = false;
    let syncInterval = null;
    let pendingStart = false;

    function setVideoState(isActive) {
        videoEmbed.classList.toggle('is-active', isActive);
        document.body.classList.toggle('video-active', isActive);
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

    playOverlay.addEventListener('click', () => {
        startExperience();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            setVideoState(false);
            pauseReactiveAudio();
            clearStarted();
        }
    });

    window.addEventListener('beforeunload', clearSyncInterval);

    loadYouTubeApi();
})();
