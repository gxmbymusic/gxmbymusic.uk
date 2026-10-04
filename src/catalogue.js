/* ============================================================
   catalogue.js
   Every release, newest first, plus the URL helpers. Moved
   from media.js (now _retired/) so the player and the tests
   share one source. Pure data + functions: no DOM, so Node
   can import it directly (test/catalogue.test.mjs).

   `kind`: 'yt' = 16:9 video, 'short' = 9:16 Short, 'sc' = SoundCloud.
   `id`  : YouTube video ID, or SoundCloud permalink slug.
   `art` : optional artwork URL. YouTube defaults to the video's
           own thumbnail; SoundCloud needs it set explicitly.
   `notes`: optional text shown in the song panel.

   Two rules govern what appears here:
   1. Named uploads only. Four YouTube uploads carry no real
      title (three are titled with their upload date, one is
      just a hashtag) and are deliberately excluded.
   2. Where a release exists on both platforms, YouTube wins.
      The SoundCloud copies of Expressions, the Deh Deh remix,
      A30 and "untitled riddim" are therefore omitted.
   ============================================================ */

// SoundCloud artist avatar, for tracks uploaded without artwork.
export const SC_AVATAR = 'https://i1.sndcdn.com/avatars-kVbOLYWnZBtFwIY6-k7AwvQ-t500x500.jpg';

export const MEDIA = [
    { kind: 'sc',    id: 'reaoons',     title: 'reasons',                           date: '2026-09-16', art: SC_AVATAR },
    { kind: 'yt',    id: 'dd2-Gkox3f0', title: 'Expressions',                       date: '2026-03-03', reactive: true },
    { kind: 'short', id: 'daPsbUsYch4', title: 'glass',                             date: '2026-01-26' },
    { kind: 'short', id: 'ZuHlhjUtnPI', title: 'Nobodyelse',                        date: '2026-01-20' },
    { kind: 'sc',    id: 'dazed',       title: 'Dazed',                             date: '2026-01-12', art: SC_AVATAR },
    { kind: 'sc',    id: 'discretion',  title: 'Discretion',                        date: '2026-01-05',
      art: 'https://i1.sndcdn.com/artworks-jgB0lg9evAMkf74y-gDiGLQ-t500x500.jpg' },
    { kind: 'yt',    id: 'zJasmyniP08', title: 'Unknown T — Deh Deh (GXMBY Remix)', date: '2025-11-01' },
    { kind: 'yt',    id: 'sha2p0Us7R0', title: 'untitled riddim',                   date: '2025-10-06' },
    { kind: 'yt',    id: 'CC84bMCai0I', title: 'A30',                               date: '2025-09-30' },
    { kind: 'yt',    id: 'Ju-mJxvLybA', title: 'Live Stream',                       date: '2024-03-21' },
    { kind: 'yt',    id: 'uaM3Y_ZHYEY', title: 'Runouts II',                        date: '2023-04-26' },
    { kind: 'yt',    id: 'QqJT5nlQEZc', title: 'Savoir Faire',                      date: '2023-04-15' }
];

export const SOURCE_LABEL = { yt: 'youtube', short: 'youtube', sc: 'soundcloud' };

export function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00Z');
    return d.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
    }).toLowerCase();
}

export function canonicalUrl(item) {
    if (item.kind === 'sc') return `https://soundcloud.com/gxmby/${item.id}`;
    if (item.kind === 'short') return `https://www.youtube.com/shorts/${item.id}`;
    return `https://www.youtube.com/watch?v=${item.id}`;
}

// SoundCloud uses the "visual" player: artwork full-bleed with a dark
// overlay, so it sits in a 16:9 box like the videos and reads on both
// themes (the compact player is a bright white card).
export function embedUrl(item) {
    if (item.kind === 'sc') {
        const target = encodeURIComponent(canonicalUrl(item));
        return 'https://w.soundcloud.com/player/?url=' + target +
            '&color=%23000000&auto_play=false&hide_related=true' +
            '&show_comments=false&show_user=true&show_reposts=false' +
            '&show_teaser=false&visual=true';
    }
    return `https://www.youtube.com/embed/${item.id}` +
        '?enablejsapi=1&playsinline=1&rel=0&modestbranding=1';
}

// Shorts get the vertical thumbnail; maxres exists for every video here
// (checked 2026-10-04).
export function artUrl(item) {
    if (item.art) return item.art;
    if (item.kind === 'short') return `https://i.ytimg.com/vi/${item.id}/oardefault.jpg`;
    return `https://i.ytimg.com/vi/${item.id}/maxresdefault.jpg`;
}

export const years = () => {
    const ys = MEDIA.map(m => Number(m.date.slice(0, 4)));
    return [Math.min(...ys), Math.max(...ys)];
};
