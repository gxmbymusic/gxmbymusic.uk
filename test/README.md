# Tests

```sh
npm install && npm run build   # in the repo root — the browser suites test dist/
cd test
npm run setup   # once — installs Playwright + Chromium
npm test
```

Three suites, deliberately split by what they can prove:

| File | Runs in | Catches |
|---|---|---|
| `catalogue.test.mjs` | Node | Catalogue curation and recency order, embed URLs, permalinks, artwork (`src/catalogue.js` is pure data) |
| `player.test.js` | Chromium, third parties blocked | Player behaviour: lazy embeds, one modal at a time, embeds kept alive, Escape and focus, volume slider, a11y wiring |
| `layout.test.js` | Chromium | Whether the artwork and the **whole first release row** are actually **visible** on load, across six viewports |

The split matters. A shipped bug once made the whole release list invisible —
the hero was `min-height: 100svh`, so the list began exactly at the fold, and
with no scroll affordance the page read as empty. Every embed was correct and
the DOM tests passed completely clean, because they could not see layout.
Anything about position, size or visibility has to be asserted in a real
browser, which is what `layout.test.js` is for. It caught the same problem
again in step 4: the player's original photo-on-top layout put the first
release below the fold on tablets and desktops.

The browser suites serve the built `dist/` on an ephemeral port (`serve.js`),
so they need no running server — but they do need a fresh `npm run build`, or
they test stale output. Point them at a deployment instead by passing a URL:

```sh
node layout.test.js https://gxmbymusic.uk/
```

## Not covered automatically

`player.test.js` blocks YouTube and SoundCloud, so it proves our DOM, not the
embeds. Check by hand after changing `src/embeds.js`: playing Expressions makes
the wordmark and background react, the volume dial changes YouTube and
SoundCloud volume (not on iOS, which ignores it), and closing a release pauses it.

## Updating the catalogue

The release list lives in `MEDIA` in `../src/catalogue.js`. Two rules govern
it, both asserted by `catalogue.test.mjs`: named uploads only, and YouTube wins
where a release exists on both platforms. Adding an entry means updating the
counts in that file and `layout.test.js` (`12 releases`, `9 youtube + 3 soundcloud`).
