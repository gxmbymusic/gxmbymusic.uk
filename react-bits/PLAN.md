# GXMBY site refresh: unified component plan

## Context

`react-bits/` holds eight saved agent briefs for new components: seven from React Bits and one from 21st.dev. Each brief describes one component on its own. None of them knows about this site or about the other seven. This plan turns them into one design for gxmbymusic.uk. For every brief it says what goes where and why, how the pieces share the page, and what to change in the existing code.

The site today is static HTML and vanilla JS with no build step. That includes `index.html`, `style.css`, `engine.js` (Web Audio + one rAF loop), `particles.js` and `media.js` (the release accordion), plus Playwright/jsdom tests in `test/`. All the briefs are React components.

**Decisions made with the user:**
- Stack: **Vite + React islands**. React mounts into slots in the existing `index.html`. `engine.js` stays vanilla and untouched apart from small edits.
- Background: **Molten Metal**. Balatro is not used.
- Music player: **replaces the accordion** and becomes the release browser.
- Wordmarks: **one GXMBY** (Depth Text). Warp Text says "RELEASES". Tech Text renders the social links.
- Hero image: the **Unsplash placeholder** from the DitherVeil brief for now.
- Host: **Cloudflare Pages**. The build command and output folder change.
- Theme goes **dark**. Every colour in the briefs is near-white (`#f8fafc`, `#f8f5ff`, `#fdfdfd`, `#ffffff`) and would vanish on today's white page.

Step 0 for the implementing agent: copy this file into the repo as `react-bits/PLAN.md`, so it sits next to the briefs.

---

## Page map (top → bottom)

```
┌ fixed, z0 ── MoltenMetal (whole viewport, behind everything) ──────────┐
│ fixed, z2 ── #ghostCanvas (engine.js audio echoes, kept)               │
│ ┌ header.hero (max(56svh,18rem), unchanged height) ───────────────────┐│
│ │  DitherVeil  (fills hero, takes pointer)                            ││
│ │  h1#mainText → DepthText "GXMBY" (centred, pointer-events:none)     ││
│ └─────────────────────────────────────────────────────────────────────┘│
│ ┌ main.releases (dark glass plate) ───────────────────────────────────┐│
│ │  h2#releasesTitle → WarpText "RELEASES" (short band, ~clamp 72–140px)│
│ │  #player → MusicPlayer (artwork, release list, song modal           ││
│ │            with embed + CometDial volume, artist modal)             ││
│ └─────────────────────────────────────────────────────────────────────┘│
│ footer → 4 × <a> each wrapping TechText (instagram / x / youtube / sc) │
└────────────────────────────────────────────────────────────────────────┘
```

## What goes where, and why

| Brief | Goes in | Why there | Brief props to keep | Changes from the brief |
|---|---|---|---|---|
| `background-molten-metal.md` → **MoltenMetal** | `#bg`, a fixed full-viewport div at z-index 0. It replaces `#particleCanvas`. | It changes uniforms in place, so it can be **audio-reactive** with no WebGL rebuild. It also pauses off-screen and in background tabs. | color1 `#5227FF`, color2 `#d3e45a`, color3 `#FFFFFF`, speed .35, scale 4, detail 3, glow 1.6, coreSize .16, swirl 1, fold -.2, blackPoint .13, brightness 1.3, grain .05, mouseStrength .3 | **One small, marked edit:** in `loop`, read `window.GXMBYEngine?.level?.()` and scale `uGlow` / `uBrightness` by energy. Leave `uSpeed` alone, because `time*uSpeed` jumps phase whenever speed changes. Under reduced motion, set `speed={0}` and `mouseInteraction={false}`. |
| `hero-dither-veil.md` → **DitherVeil** | `#heroVeil`, positioned absolute to fill `header.hero` | It's the hero's interactive image. The cursor reveals full colour through the dither, and `wander` keeps it moving when nobody touches it. | pattern bayer, pixelSize 1, inkColor `#120f17`, paperColor `#3B82F6`, revealRadius 70, softness .55, linger 1.2, fit cover, rimColor `#9c8ccc`, palette rgb, contrast 1.3, brightness .14, wander | `src` = the brief's Unsplash URL, held in one constant, `HERO_IMAGE` in `src/config.js`, so swapping in a real photo later is a one-line change. `.hero` changes from `pointer-events:none` to `auto` so the veil gets the pointer. |
| `billboard_hero.depth-text.md` → **DepthText** | Mounted **inside** the static `<h1 id="mainText">` in the hero, centred over the veil | It's the single "GXMBY" billboard. The h1 stays in the static HTML because `engine.js` looks up `#mainText` when the page loads (`engine.js:25-29`). | layers 13, depth 4, faceColor `#f8fafc`, depthColor `#3B82F6`, tilt 7.5, pointerTracking, smoothing .19, perspective 900, autoOrbit, orbitSpeed .45, fontWeight 900, shadow | Text is `"GXMBY"`. The brief's trailing space would throw off the centring. Set the size on the h1 (`font-size: clamp(3.5rem, 25vw, 25rem)`) and pass `fontSize="1em"`, so `engine.js` (`getComputedStyle(mainText).fontSize`) and the echoes match it. The h1 gets `pointer-events:none`. DepthText listens on `window`, so tilt still works. |
| `body-warp-text.md` → **WarpText** | `<h2 id="releasesTitle">`, which replaces `.releases-heading` | It's the section title. The glass-lens warp suits a heading the cursor passes over on the way to the list, and labelling it "RELEASES" keeps GXMBY to one place on the page. | color `#f8f5ff`, warpStrength .12, warpScale 1.9, speed .55, pointerInfluence .33, pointerStrength .48, refraction .03, ripple, fontWeight 800, letterSpacing -0.03 | Text is `"RELEASES"`. Use `style={{height:'clamp(72px,14vw,140px)'}}` and override `.warp-text{min-height:0}`. The brief's 320px height would push the player below the fold, which is what the layout test exists to catch. Set `fontFamily="OpenSauceSans"`. |
| `music-player.md` → **MusicPlayer** (progressive-blur modal) | `#player` in `main.releases`. It **replaces `#mediaList` and `media.js`.** | It becomes the release browser: artwork, a list of all 12 releases, a song modal holding the embed, and an artist modal for the bio. | — (the brief is a demo) | Rewritten around real data. See *Music player*, below. |
| `volume-comet-dial.md` → **CometDial** | Inside the player's **song modal**, next to the open embed | It's the volume control for whatever is playing. | min 0, max 100, step 1, unit "%", label "Volume", accent `#f5f5f5`, ink `#fdfdfd`, sweep 320, thickness 3, speed 25, tapBounce .22, flickBounce .26, momentum 1.6, cometReach 135, cometWidth 6 | `size` goes from 250 to ~140 to fit the modal. `onChange` sets the volume on the open embed (see below). Imported from `motion/react`, as in the brief. |
| `links-tech-text.md` → **TechText** | The footer. Each social link is an `<a>` that wraps its own TechText. | The links become technical wordmarks. Each is still a real link (`href`, `aria-label`) underneath. | fontWeight 900, reveal "letter", dashLength 10, dashGap 2, specks 15, letterSpacing .11, strokeWidth 2.75, speed 1.6 | Text is the link label (instagram / x / youtube / soundcloud). **`draggable={false}`**, because dragging a letter inside a link would navigate on release. **`sweep={false}`**, so four idle rAF loops don't run forever. `fontSize` is ~40 in a fixed box (`width: clamp(7rem,20vw,12rem); height: 3.5rem`), on a 2×2 grid on mobile. `fontFamily="OpenSauceSans"`. |
| `background-balatro.md` → Balatro | **Not used** | The user chose Molten Metal. Balatro also rebuilds its WebGL context on every prop change and never pauses, so it's a poor fit for audio. | — | The brief stays in `react-bits/` for reference. |

### Music player (the one brief that needs real work)

The 21st.dev brief is a Beyoncé demo. It asks for TypeScript, Tailwind 4 and shadcn, and **it ships with no stylesheet**: every class it uses (`content-wrapper`, `song-modal`, `gradient-blur`…) is undefined. It uses no Tailwind utilities at all. So:

- **Skip TypeScript, Tailwind, shadcn, tw-animate-css and lucide-react.** Convert it to `MusicPlayer.jsx` + `MusicPlayer.css`, the same "JavaScript + CSS" shape as the React Bits briefs. The only TS in it is `useRef<HTMLDivElement>`.
- **CSS:** first try to fetch the original stylesheet from the component's 21st.dev page. If that fails, write it from the markup. `.gradient-blur` is the usual 8-layer stack with stepped `backdrop-filter` and `mask-image` bands. Scope **every** selector under `.gx-player`, because `.modal`, `.content`, `.song`, `.bold` and `.light` are generic class names. Change the root `<main>` to a `<div>`, since the page already has `<main class="releases">`.
- **Data:** move the `MEDIA` catalogue and its helpers (`formatDate`, `canonicalUrl`, `embedUrl`, `SOURCE_LABEL`) unchanged from `media.js:35-78` into `src/catalogue.js`, a plain ES module. Both of its rules (named uploads only, YouTube wins) and the newest-first order carry over. Add two optional fields: `art` (artwork URL) and `notes` (text for the song modal).
- **Mapping:**
  - photo → artwork of the selected release. The default is the newest. YouTube uses `https://i.ytimg.com/vi/{id}/hqdefault.jpg`. SoundCloud uses `art`, or else `HERO_IMAGE`.
  - title + `title-info` → the selected release's title · source · date.
  - `songs` → all 12 releases, with the date where the demo shows a duration.
  - Song click → select that release and open the song modal. The modal holds: title row with close, a lazily mounted embed (16:9 / 9:16 Short / 166px SoundCloud, as in `style.css:258-280`), CometDial, the `open on youtube ↗` permalink, and `notes`.
  - Artist toggle → GXMBY bio and photo, plus "12 releases".
- **The demo's positioning has to be generalised.** It only measures the *first* song (`songOpenRef`) and uses a magic `- 390` offset. Measure whichever row was clicked, and derive the offset from the modal's real height.
- **Port from `media.js`, don't reinvent:**
  - Lazy iframe mount on first open, with the same `allow` / `referrerPolicy` attributes (`media.js:133-151`).
  - Pause on close, keeping the iframe so playback resumes where it stopped (`media.js:154-165`).
  - One open at a time (the modal enforces this).
  - Loading the YouTube IFrame API and building `YT.Player` (`media.js:250-281`).
  - The reactive bridge: when **Expressions** plays, call `GXMBYEngine.setPlayback` and re-sync every 2s (`media.js:221-247`).
  - Pause on `visibilitychange`.
- **Volume:** CometDial `onChange(v)` → `ytPlayer.setVolume(v)`, or for SoundCloud, `iframe.contentWindow.postMessage(JSON.stringify({method:'setVolume', value:v}), '*')`. Remember the last value and apply it in the YouTube `onReady` / SoundCloud ready event when a new embed mounts. Known limitation: iOS ignores programmatic volume on embeds. There, the dial moves but the volume doesn't change. Document it; don't hack around it.
- **Placeholders the user fills later:** bio text, artist photo, per-release `notes`, SoundCloud artwork.

#### As built (step 4)

- **CSS source:** 21st.dev's registry needs an API key, so the stylesheet came from the user's CodePen fork `dariusatsudev/pen/QwpqXoN` (of `kiranpate1/pen/wBwbRBq`). The fork's edits are kept: the card and the song-modal info scroll. Its stray `.` makes the song modal's 800px blur rule invalid, so that rule is dropped, as browsers already drop it. Scoped under `.gx-player`, themed with `--p-*` tokens, and set in OpenSauceSans. **License of the original pen/component: unknown; ask the author before shipping.**
- **Layout:** two columns from 768px up (artwork sticky on the left, list on the right). On phones, an 84px cover sits beside the title. The pen's photo-on-top layout put the first release below the fold at every size (the user chose this in step 4).
- **Artwork:** YouTube uses `maxresdefault.jpg` (Shorts: `oardefault.jpg`), all checked to exist. Discretion has its own SoundCloud artwork; reasons and Dazed have none, so they use the SoundCloud avatar (`SC_AVATAR` in `src/catalogue.js`). The artist modal shows the avatar too.
- **SoundCloud embeds** use the "visual" player in a 16:9 box (`visual=true`). The compact player was a white card on the dark page.
- **Song modal** starts over the clicked row and rises (`--rise`) to fill the card. No fixed 400px height and no magic offset.
- **Bio** is `ARTIST_BIO` in `src/config.js`, a placeholder ("Music by GXMBY.", the existing og:description).
- **Tests moved here from step 6,** so every commit stays green: `catalogue.test.mjs` (Node), `player.test.js` (Chromium, offline), `layout.test.js` (now asserts the artwork and the whole first row are above the fold). `accordion.test.js` is retired.

#### Player restyle (after step 6, user request)

- **All player text is lowercase** (`text-transform`; the DOM keeps real capitals for screen readers). Not small caps: OpenSauceSans has no true small caps, so browsers would fake them with shrunken capitals.
- **One type scale:** display (titles), body (names, bio, links), meta (dates, sources, counts, labels). **One spacing scale:** `--pad` on every card edge, `--gap` between columns, rows of `--row-h`.
- **Rest view:** artwork with title and meta below it on the left; numbered rows with hairline dividers on the right. The "+" disc became an "about gxmby" bar at the bottom of the left column (on phones, the bottom of the card, with the list fading out beneath it).
- **Song panel:** grows from the clicked row's exact box. The embed is sized from the card (`.content` is a size container), so the video, volume dial and link always fit, grouped and edge-aligned.
- **Artist panel:** fills the card and mirrors the main layout: avatar, name and counts left; bio and platform links (`SOCIAL` in `src/config.js`) right.
- **The theme toggle** is absolute in the hero instead of fixed, so it no longer covers the player's close button.

#### Step 5 as built

> **Swapped after step 5 (user request):** the RELEASES heading uses **TechText** and the footer links use **WarpText**, the reverse of the table above. The notes below describe the swapped build. Cost: four extra WebGL contexts (six in all), and the footer-in-view frame rate in software rendering fell from 24.8 to 15.4 fps.

- **TechText heading** mounts inside `h2#releasesTitle`. The h2 keeps the class `.releases-heading` the tests rely on, and "Releases" stays as the no-JS fallback. Height is `clamp(64px, min(14vw, 12svh), 140px)`: `14vw` alone pushed the first release below the fold on the 1366×640 laptop. Brief props otherwise, including drag and idle sweep (it isn't a link, so dragging is harmless).
- **WarpText links** come from a site wrapper, `src/components/SocialLink`, mounted inside each real `<a data-tech>`. Each box is measured from its own label, so all four render at one size (32px, 24px on phones); WarpText otherwise shrinks text to fit a fixed box. `letterSpacing` is `"-0.03em"`; the brief's bare `-0.03` means px, which is effectively zero.
- **Fonts:** `islands.jsx` requests OpenSauceSans 800/900 up front. Canvas text only waits for faces the page has already asked for.
- **The releases plate is gone.** The player card has its own surface, and the full-width glass panel only drew hard edges across the hero fade and above the footer.

## Light / dark theme (added in step 3 at the user's request)

- **Source of truth:** `<html data-theme="light|dark">`, set by `public/theme.js`. It loads blocking in `<head>`, so the theme is set before first paint. It follows the system preference until the visitor clicks `#themeToggle` (fixed, top right), then remembers the choice in `localStorage`, wrapped in try/catch.
- **CSS:** dark tokens on `:root`, light tokens on `:root[data-theme="light"]`. The light palette is the site's original black-on-white.
- **Components:** every colour that differs by theme lives in `PALETTES` in `src/theme.js`. Islands read it with `usePalette()`, which watches the attribute; islands are separate React roots, so a context wouldn't reach them. **Every later island (WarpText, TechText, CometDial, the player) gets a `light` entry there too.**
- **Light-mode notes:** Molten Metal uses its built-in `lightMode` with a pale palette at opacity 0.7, because the dark palette turned into heavy smudges on white. DitherVeil's ink is white so its keyed backdrop blends into the page.

## Changes to existing code

- **`engine.js`** (small and surgical; the sync logic stays as it is):
  - Store the last `{energy, transient}` in `tick()` and expose `GXMBYEngine.level = () => last`.
  - Delete the `textShadow` line (`engine.js:252`). It's inherited by DepthText's 13 layers, and the black glow means nothing on a dark page.
  - Echo font goes from `'Arial Black'` / `-0.2em` (`engine.js:217-220`) to `'OpenSauceSans'` 900 / `-0.065em`, to match DepthText.
  - `applyMainText` keeps transforming `#mainText`. That's safe, because DepthText transforms its own inner `.depth-text__stage`.
  - The `if (window.Particles)` guard already handles particles being gone.
- **`particles.js`**: retire it. Move it to `_retired/particles.js` (quarantined, not deleted), and remove `#particleCanvas` and its script tag. Molten Metal takes its place.
- **`media.js`**: retire it to `_retired/media.js` once the player has its logic.
- **`index.html`**:
  - Add the slot elements `#bg`, `#heroVeil` and `#player`, plus `#releasesTitle` in place of `.releases-heading`.
  - Keep `#ghostCanvas`, `h1#mainText` and `#syncAudio` static.
  - Footer links get `data-tech` + `aria-label`.
  - `theme-color` becomes the dark background colour.
  - Add `<script type="module" src="/src/islands.jsx">` after `engine.js`. Module scripts are deferred, so the engine always exists first.
- **`style.css`**:
  - Dark tokens on `:root`: `--bg:#0b0a0f`, `--fg:#f8fafc`, `--fg-muted:rgba(248,250,252,.55)`, `--rule:rgba(255,255,255,.14)`.
  - The `.releases` plate becomes dark glass (`rgba(18,15,23,.62)` + the existing blur).
  - Delete the accordion rules (`style.css:154-302`).
  - Add `.hero` stacking for the veil and text, and the footer TechText grid.
  - The existing reduced-motion block stays.

## Build and file layout

```
package.json              root: react, react-dom, ogl, motion; dev: vite, @vitejs/plugin-react
vite.config.js            plugin-react; build.outDir 'dist'
index.html                Vite entry (stays at root)
public/engine.js          moved here so Vite copies the classic script as is
public/audio/…            moved (production /audio/* is served by worker.js from R2 anyway)
src/islands.jsx           one createRoot per slot; reads prefers-reduced-motion once
src/config.js             HERO_IMAGE
src/theme.js              useTheme / usePalette; PALETTES (all theme-dependent colours)
public/theme.js           sets <html data-theme> before paint; wires #themeToggle
src/catalogue.js          MEDIA + helpers moved out of media.js
src/components/<Name>/<Name>.jsx + .css   MoltenMetal, DitherVeil, DepthText, WarpText, TechText, CometDial, MusicPlayer
scripts/extract-react-bits.mjs            copies the "Full Component Source" / "Component CSS" fences from react-bits/*.md
```

- **Use the extract script, not retyping.** It copies each component exactly as it appears in its brief and saves ~35k output tokens. After that, apply only the local edits listed above, each marked with a `// gxmby:` comment.
- `worker.js`, `wrangler.toml` and `generate-reactive-sequence.js` stay at the root, outside the Vite build.
- **Cloudflare Pages:** build command `npm run build`, output folder `dist`. This is a change the user makes in the dashboard, so log it in Linear, project *System plan*, per the global instructions. Don't change it from here.

## Order of work (each step ends verifiable)

1. **Scaffold:** Vite + React. Move `engine.js` and `audio/` into `public/`. The site should look identical. Point `layout.test.js` at `dist/` and confirm the old accordion still passes.
2. **Dark theme + MoltenMetal** in `#bg`. Retire particles. Add `engine.level()` and the Molten audio hook.
3. **Hero:** DitherVeil in `#heroVeil` and DepthText in `#mainText`. Make the engine.js font and shadow edits.
4. **Player:** create `catalogue.js`, write MusicPlayer + CSS, and add CometDial in the song modal. Port the YouTube/SoundCloud logic and the reactive bridge. Retire `media.js`.
5. **WarpText** heading and **TechText** footer links.
6. **Tests and docs.** Update `test/`, `test/README.md`, and the Linear issue for the Pages settings.

## Verification

- `npm run build && npm run preview`, then check by hand in Chrome:
  - Molten Metal visible behind the plate.
  - Veil reveal follows the cursor.
  - DepthText tilts.
  - Playing **Expressions** makes the GXMBY billboard pulse, spawns echoes and brightens Molten Metal.
  - CometDial changes YouTube and SoundCloud volume.
  - Closing the modal pauses playback; reopening resumes.
  - Footer links navigate.
  - No console errors.
- **`test/layout.test.js`** (serves `dist/`, all six viewports): the hero, the WarpText band, the player artwork and the **first release row are above the fold**. 12 rows render. **0 iframes on load.** No page errors.
- **`test/player.test.js`**, replacing `accordion.test.js`:
  - A plain Node import of `src/catalogue.js` checks 12 items, 9 YouTube + 3 SoundCloud, newest first, and no unnamed uploads.
  - Playwright on `dist/`: opening a release mounts exactly one iframe, opening another keeps one modal open, the dial has `role="slider"` and the right `aria-valuenow`, and the links are real `<a href>` elements.
- **Reduced motion** (emulated in Playwright): Molten is static, the veil doesn't wander, and nothing throws.
- **Performance check:** 3 WebGL contexts (Molten, Veil, Warp). Profile on a mid-range phone viewport. If frame rate sags, drop Molten's DPR to 1.

## Performance (step 6, measured 2026-10-04)

Phone viewport 393×852 @3x, headless Chromium with software WebGL. That exaggerates GPU cost, but the ratios hold. Knockout ranking (frame time): DitherVeil ~49 ms > MoltenMetal ~34 ms > WarpText ≈ 0; page JavaScript is negligible.

Changes, all chosen by the user:

| Change | Where |
|---|---|
| MoltenMetal renders at 1× on every screen (a soft glow; quarter of the 2× pixels) | `MoltenMetal.jsx`, marked `gxmby:` |
| DitherVeil `wander` only with a fine pointer; touch screens play the intro, then sleep until tapped | `islands.jsx` |
| Footer WarpText links redraw only while hovered or keyboard-focused, then fade flat and stop (`hoverOnly` / `engaged` props) | `WarpText.jsx`, marked `gxmby:`; `SocialLink.jsx` |

| | Top | Mid-page | Footer |
|---|---|---|---|
| Before | 10.9 fps | 19.9 fps | 19.6 fps |
| After | 60.3 fps | 60.3 fps | 60 fps |

Hero draws in 3 s on a touch screen after the intro: 68 → 0. Idle footer links: 0 draws.
