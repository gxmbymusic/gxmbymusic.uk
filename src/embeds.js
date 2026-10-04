/* ============================================================
   embeds.js
   Control of the YouTube / SoundCloud iframes, ported from
   media.js (now _retired/): API loading, pause, volume, and the
   audio-reactive bridge to engine.js.

   Each mounted iframe gets a controller:
     { pause(), setVolume(v 0–100), dispose() }

   Volume note: iOS ignores programmatic volume on embedded
   players (hardware buttons only). The dial still moves there;
   the volume just doesn't change. Not worked around.
   ============================================================ */

/* ── YouTube IFrame API (loaded once, on first YouTube embed) ── */
let ytApi = null;

function loadYouTubeApi() {
    if (ytApi) return ytApi;
    ytApi = new Promise(resolve => {
        if (window.YT && window.YT.Player) {
            resolve(window.YT);
            return;
        }
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if (typeof prev === 'function') prev();
            resolve(window.YT);
        };
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            const s = document.createElement('script');
            s.src = 'https://www.youtube.com/iframe_api';
            s.async = true;
            document.head.append(s);
        }
    });
    return ytApi;
}

/* ── Audio-reactive bridge ───────────────────────────────────
   Only the item flagged `reactive` has a local mp3 matching the
   embed, so only it can drive engine.js. Re-sync every 2s to
   correct clock drift. Same behaviour as media.js. */
let syncInterval = null;
let reactiveOwner = null;

function startReactive(item, player) {
    if (!item.reactive || !window.GXMBYEngine) return;
    reactiveOwner = item.id;
    document.body.classList.add('video-active');
    const push = () => {
        const ct = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
        window.GXMBYEngine.setPlayback({ playing: true, currentTime: ct });
    };
    push();
    clearInterval(syncInterval);
    syncInterval = setInterval(push, 2000);
}

export function stopReactive(item) {
    if (!item || !item.reactive || reactiveOwner !== item.id) return;
    reactiveOwner = null;
    clearInterval(syncInterval);
    syncInterval = null;
    document.body.classList.remove('video-active');
    if (window.GXMBYEngine) window.GXMBYEngine.setPlayback({ playing: false, currentTime: 0 });
}

/* ── Controllers ─────────────────────────────────────────── */

// `getVolume` is read when the player becomes ready, so a new embed
// starts at whatever the dial says. `onPlaying(bool)` reports state.
export function attachEmbed(item, iframe, { getVolume, onPlaying }) {
    return item.kind === 'sc'
        ? attachSoundCloud(item, iframe, { getVolume, onPlaying })
        : attachYouTube(item, iframe, { getVolume, onPlaying });
}

function attachYouTube(item, iframe, { getVolume, onPlaying }) {
    let player = null;
    let disposed = false;

    loadYouTubeApi().then(YT => {
        if (disposed) return;
        player = new YT.Player(iframe, {
            events: {
                onReady: () => player.setVolume(getVolume()),
                onStateChange: ({ data }) => {
                    const S = YT.PlayerState;
                    if (data === S.PLAYING) {
                        onPlaying?.(true);
                        startReactive(item, player);
                    } else if (data !== S.BUFFERING) {
                        onPlaying?.(false);
                        stopReactive(item);
                    }
                }
            }
        });
    });

    const post = (func, args = '') =>
        iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');

    return {
        pause() {
            if (player && typeof player.pauseVideo === 'function') player.pauseVideo();
            else post('pauseVideo');
        },
        setVolume(v) {
            if (player && typeof player.setVolume === 'function') player.setVolume(v);
            else post('setVolume', [v]);
        },
        dispose() {
            disposed = true;
            stopReactive(item);
        }
    };
}

function attachSoundCloud(item, iframe, { getVolume, onPlaying }) {
    const send = (method, value) =>
        iframe.contentWindow?.postMessage(JSON.stringify(value === undefined ? { method } : { method, value }), '*');

    // The widget announces itself with "ready"; subscribe to play/pause
    // then, and apply the dial's volume.
    const onMessage = e => {
        if (e.source !== iframe.contentWindow) return;
        let msg;
        try {
            msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        } catch {
            return;
        }
        if (!msg || !msg.method) return;
        if (msg.method === 'ready') {
            send('addEventListener', 'play');
            send('addEventListener', 'pause');
            send('addEventListener', 'finish');
            send('setVolume', getVolume());
        } else if (msg.method === 'play') onPlaying?.(true);
        else if (msg.method === 'pause' || msg.method === 'finish') onPlaying?.(false);
    };
    window.addEventListener('message', onMessage);

    return {
        pause: () => send('pause'),
        setVolume: v => send('setVolume', v),
        dispose: () => window.removeEventListener('message', onMessage)
    };
}
