/* ============================================================
   config.js
   Site-wide content that is expected to change.
   ============================================================ */

// Hero image for DitherVeil. Must be same-origin or served with
// CORS headers (the veil reads its pixels). Placeholder from the
// brief until a real photo goes in public/images/.
export const HERO_IMAGE =
  'https://images.unsplash.com/photo-1737071371043-761e02b1ef95?q=80&w=1400&auto=format&fit=crop';

// Artist panel text in the player (shown lowercase, like all player text).
export const ARTIST_BIO = 'Darius Atsu (aka: gxmby, unimke, + others not mentioned).  Artist/Musician from SW London.';

// Platform links in the player's artist panel. Same targets as the
// footer links in index.html.
export const SOCIAL = [
    { label: 'youtube',    handle: '@gxmby',   href: 'https://youtube.com/@gxmby' },
    { label: 'soundcloud', handle: 'gxmby',    href: 'https://soundcloud.com/gxmby' },
    { label: 'instagram',  handle: '@gxmby',   href: 'https://instagram.com/gxmby' },
    { label: 'x',          handle: '@gxmbysk', href: 'https://x.com/gxmbysk' }
];
