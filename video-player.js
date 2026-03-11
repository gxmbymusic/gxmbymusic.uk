(function() {
    const videoEmbed = document.querySelector('.video-embed');
    const iframe = document.getElementById('heroVideo');

    if (!videoEmbed || !iframe) return;

    let player;
    let apiReady = false;
    let stateInterval = null;

    function setVideoState(isActive) {
        videoEmbed.classList.toggle('is-active', isActive);
        document.body.classList.toggle('video-active', isActive);
    }

    function clearStateInterval() {
        if (stateInterval) {
            window.clearInterval(stateInterval);
            stateInterval = null;
        }
    }

    function updateTimeline(isPlaying) {
        if (!player || typeof player.getCurrentTime !== 'function') {
            return;
        }

        if (window.GXMBYTimeline && typeof window.GXMBYTimeline.setPlaybackState === 'function') {
            window.GXMBYTimeline.setPlaybackState({
                isPlaying,
                currentTime: player.getCurrentTime()
            });
        }
    }

    function startStateInterval() {
        clearStateInterval();
        stateInterval = window.setInterval(() => {
            updateTimeline(true);
        }, 120);
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
                onStateChange: ({ data }) => {
                    if (data === window.YT.PlayerState.PLAYING) {
                        setVideoState(true);
                        updateTimeline(true);
                        startStateInterval();
                        return;
                    }

                    if (data === window.YT.PlayerState.BUFFERING) {
                        setVideoState(true);
                        updateTimeline(true);
                        return;
                    }

                    setVideoState(false);
                    clearStateInterval();
                    updateTimeline(false);

                    if (data === window.YT.PlayerState.PAUSED || data === window.YT.PlayerState.CUED) {
                        updateTimeline(false);
                    }
                }
            }
        });
    };

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            setVideoState(false);
            clearStateInterval();
            updateTimeline(false);
        }
    });

    window.addEventListener('beforeunload', clearStateInterval);

    loadYouTubeApi();
})();
