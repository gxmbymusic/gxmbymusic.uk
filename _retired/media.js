/* ============================================================
   media.js
   Builds the release list: every YouTube + SoundCloud item,
   newest first, as an accordion of expanding links.

   Behaviour:
   ─────────
   - One panel open at a time. The first (newest) opens on load.
   - Iframes are injected lazily, only on first expand, so the
     page ships with zero third-party embeds until asked.
   - Collapsing pauses the embed (YT IFrame API / SC Widget API
     postMessage) instead of tearing the iframe down, so
     re-opening resumes where you left off.
   - The one item that has a matching local mp3 (`reactive: true`)
     drives the Web Audio visuals via GXMBYEngine.
   ============================================================ */

(function () {
    const listEl = document.getElementById('mediaList');
    if (!listEl) return;

    /* ── Catalogue ────────────────────────────────────────────
       Ordered newest → oldest by publish date.
       `kind`: 'yt' = 16:9 video, 'short' = 9:16 Short, 'sc' = SoundCloud.
       `id`  : YouTube video ID, or SoundCloud permalink slug.

       Two rules govern what appears here:
       1. Named uploads only. Four YouTube uploads carry no real
          title (three are titled with their upload date, one is
          just a hashtag) and are deliberately excluded.
       2. Where a release exists on both platforms, YouTube wins.
          The SoundCloud copies of Expressions, the Deh Deh remix,
          A30 and "untitled riddim" are therefore omitted.
       ───────────────────────────────────────────────────────── */
    const MEDIA = [
        { kind: 'sc',    id: 'reaoons',     title: 'reasons',                           date: '2026-09-16' },
        { kind: 'yt',    id: 'dd2-Gkox3f0', title: 'Expressions',                       date: '2026-03-03', reactive: true },
        { kind: 'short', id: 'daPsbUsYch4', title: 'glass',                             date: '2026-01-26' },
        { kind: 'short', id: 'ZuHlhjUtnPI', title: 'Nobodyelse',                        date: '2026-01-20' },
        { kind: 'sc',    id: 'dazed',       title: 'Dazed',                             date: '2026-01-12' },
        { kind: 'sc',    id: 'discretion',  title: 'Discretion',                        date: '2026-01-05' },
        { kind: 'yt',    id: 'zJasmyniP08', title: 'Unknown T — Deh Deh (GXMBY Remix)', date: '2025-11-01' },
        { kind: 'yt',    id: 'sha2p0Us7R0', title: 'untitled riddim',                   date: '2025-10-06' },
        { kind: 'yt',    id: 'CC84bMCai0I', title: 'A30',                               date: '2025-09-30' },
        { kind: 'yt',    id: 'Ju-mJxvLybA', title: 'Live Stream',                       date: '2024-03-21' },
        { kind: 'yt',    id: 'uaM3Y_ZHYEY', title: 'Runouts II',                        date: '2023-04-26' },
        { kind: 'yt',    id: 'QqJT5nlQEZc', title: 'Savoir Faire',                      date: '2023-04-15' }
    ];

    const SOURCE_LABEL = { yt: 'youtube', short: 'youtube', sc: 'soundcloud' };

    // Must stay >= the .media-panel transition in style.css (0.45s)
    const COLLAPSE_MS = 500;

    function formatDate(iso) {
        const d = new Date(iso + 'T00:00:00Z');
        return d.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
        }).toLowerCase();
    }

    function canonicalUrl(item) {
        if (item.kind === 'sc') return `https://soundcloud.com/gxmby/${item.id}`;
        if (item.kind === 'short') return `https://www.youtube.com/shorts/${item.id}`;
        return `https://www.youtube.com/watch?v=${item.id}`;
    }

    function embedUrl(item) {
        if (item.kind === 'sc') {
            const target = encodeURIComponent(canonicalUrl(item));
            return 'https://w.soundcloud.com/player/?url=' + target +
                '&color=%23000000&auto_play=false&hide_related=true' +
                '&show_comments=false&show_user=true&show_reposts=false' +
                '&show_teaser=false&visual=false';
        }
        return `https://www.youtube.com/embed/${item.id}` +
            '?enablejsapi=1&playsinline=1&rel=0&modestbranding=1';
    }

    /* ── Build the DOM ───────────────────────────────────────── */
    const rows = MEDIA.map((item, i) => {
        const row = document.createElement('article');
        row.className = `media-row media-row--${item.kind}`;

        const btn = document.createElement('button');
        btn.className = 'media-trigger';
        btn.type = 'button';
        btn.id = `trigger-${i}`;
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', `panel-${i}`);
        btn.innerHTML =
            `<span class="media-index">${String(i + 1).padStart(2, '0')}</span>` +
            `<span class="media-title"></span>` +
            `<span class="media-meta">` +
                `<span class="media-source">${SOURCE_LABEL[item.kind]}</span>` +
                `<span class="media-date">${formatDate(item.date)}</span>` +
            `</span>` +
            `<span class="media-chevron" aria-hidden="true"></span>`;
        // textContent so titles can never inject markup
        btn.querySelector('.media-title').textContent = item.title;

        const panel = document.createElement('div');
        panel.className = 'media-panel';
        panel.id = `panel-${i}`;
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-labelledby', `trigger-${i}`);
        panel.hidden = true;

        const inner = document.createElement('div');
        inner.className = 'media-panel-inner';

        const frameBox = document.createElement('div');
        frameBox.className = 'media-frame-box';

        const permalink = document.createElement('a');
        permalink.className = 'media-permalink';
        permalink.href = canonicalUrl(item);
        permalink.target = '_blank';
        permalink.rel = 'noopener noreferrer';
        permalink.textContent = `open on ${SOURCE_LABEL[item.kind]} ↗`;

        inner.append(frameBox, permalink);
        panel.append(inner);
        row.append(btn, panel);
        listEl.append(row);

        const rec = { item, row, btn, panel, frameBox, iframe: null, ytPlayer: null };
        btn.addEventListener('click', () => toggle(rec));
        return rec;
    });

    /* ── Lazy iframe injection ───────────────────────────────── */
    function mount(rec) {
        if (rec.iframe) return;
        const { item } = rec;

        const iframe = document.createElement('iframe');
        iframe.className = 'media-frame';
        iframe.src = embedUrl(item);
        iframe.title = `${item.title} — ${SOURCE_LABEL[item.kind]}`;
        iframe.loading = 'lazy';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.setAttribute('frameborder', '0');
        if (item.kind !== 'sc') iframe.allowFullscreen = true;

        rec.frameBox.append(iframe);
        rec.iframe = iframe;

        if (item.kind !== 'sc') attachYouTube(rec);
    }

    /* ── Playback control ────────────────────────────────────── */
    function pause(rec) {
        if (!rec.iframe) return;
        if (rec.item.kind === 'sc') {
            rec.iframe.contentWindow.postMessage('{"method":"pause"}', '*');
        } else if (rec.ytPlayer && typeof rec.ytPlayer.pauseVideo === 'function') {
            rec.ytPlayer.pauseVideo();
        } else {
            rec.iframe.contentWindow.postMessage(
                '{"event":"command","func":"pauseVideo","args":""}', '*'
            );
        }
    }

    /* ── Expand / collapse ───────────────────────────────────── */
    let openRec = null;

    function open(rec, { scroll = true } = {}) {
        if (openRec === rec) return;
        if (openRec) close(openRec);

        mount(rec);
        clearTimeout(rec.hideTimer);
        rec.panel.hidden = false;
        rec.btn.setAttribute('aria-expanded', 'true');
        openRec = rec;

        // Next frame, so the height transition has a start value to animate
        // from. Re-check `openRec`: a fast click-click can close the row
        // before this fires, and we must not re-open it behind our own back.
        requestAnimationFrame(() => {
            if (openRec === rec) rec.row.classList.add('is-open');
        });

        if (scroll) {
            rec.row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function close(rec) {
        pause(rec);
        rec.row.classList.remove('is-open');
        rec.btn.setAttribute('aria-expanded', 'false');
        if (openRec === rec) openRec = null;

        // Keep the iframe alive (preserves playhead) but take the collapsed
        // panel out of the a11y tree and tab order once it has animated shut.
        // Timer rather than `transitionend`, which never fires when the
        // transition is suppressed (reduced motion, background tab).
        clearTimeout(rec.hideTimer);
        rec.hideTimer = setTimeout(() => {
            if (!rec.row.classList.contains('is-open')) rec.panel.hidden = true;
        }, COLLAPSE_MS);

        stopReactive(rec);
    }

    function toggle(rec) {
        if (openRec === rec) close(rec);
        else open(rec);
    }

    /* ── Audio-reactive bridge ───────────────────────────────────
       Only the item flagged `reactive` has a local mp3 that
       matches the embed, so only that one can drive the
       Web Audio analyser. Everything else leaves the visuals
       in their idle drift.
       ───────────────────────────────────────────────────────── */
    let syncInterval = null;

    function startReactive(rec) {
        if (!rec.item.reactive || !window.GXMBYEngine) return;
        document.body.classList.add('video-active');
        rec.row.classList.add('is-playing');

        const push = () => {
            const ct = rec.ytPlayer && typeof rec.ytPlayer.getCurrentTime === 'function'
                ? rec.ytPlayer.getCurrentTime() : 0;
            window.GXMBYEngine.setPlayback({ playing: true, currentTime: ct });
        };
        push();
        clearInterval(syncInterval);
        syncInterval = setInterval(push, 2000); // correct clock drift
    }

    function stopReactive(rec) {
        if (rec) rec.row.classList.remove('is-playing');
        if (!rec || !rec.item.reactive) return;
        clearInterval(syncInterval);
        syncInterval = null;
        document.body.classList.remove('video-active');
        if (window.GXMBYEngine) {
            window.GXMBYEngine.setPlayback({ playing: false, currentTime: 0 });
        }
    }

    /* ── YouTube IFrame API ──────────────────────────────────── */
    const pendingYT = [];

    function attachYouTube(rec) {
        if (window.YT && window.YT.Player) buildPlayer(rec);
        else pendingYT.push(rec);
    }

    function buildPlayer(rec) {
        if (rec.ytPlayer) return;
        rec.ytPlayer = new window.YT.Player(rec.iframe, {
            events: {
                onStateChange: ({ data }) => {
                    const S = window.YT.PlayerState;
                    if (data === S.PLAYING) startReactive(rec);
                    else if (data !== S.BUFFERING) stopReactive(rec);
                }
            }
        });
    }

    const prevYTReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
        if (typeof prevYTReady === 'function') prevYTReady();
        while (pendingYT.length) buildPlayer(pendingYT.shift());
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.async = true;
        document.head.append(s);
    }

    /* ── Housekeeping ────────────────────────────────────────── */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && openRec) stopReactive(openRec);
    });
    window.addEventListener('beforeunload', () => clearInterval(syncInterval));

    /* ── First item expanded on load ─────────────────────────── */
    if (rows.length) open(rows[0], { scroll: false });
})();
