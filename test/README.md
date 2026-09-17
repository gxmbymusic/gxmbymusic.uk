# Tests

```sh
cd test
npm run setup   # once — installs deps + Chromium
npm test
```

Two suites, deliberately split by what they can prove:

| File | Runs in | Catches |
|---|---|---|
| `accordion.test.js` | jsdom | Catalogue curation, recency order, lazy mounting, single-open invariant, a11y wiring |
| `layout.test.js` | Chromium | Whether the first embed is actually **visible** on load, across six viewports |

The split matters. A shipped bug once made the whole release list invisible —
the hero was `min-height: 100svh`, so the list began exactly at the fold, and
with no scroll affordance the page read as empty. Every embed was correct and
`accordion.test.js` passed completely clean, because **jsdom performs no
layout**. Anything about position, size or visibility has to be asserted in a
real browser, which is what `layout.test.js` is for.

`layout.test.js` serves the repo on an ephemeral port, so it needs no running
server. Point it at production instead by passing a URL:

```sh
node layout.test.js https://gxmbymusic.uk/
```

## Updating the catalogue

The release list lives in `MEDIA` at the top of `../media.js`. Two rules govern
it, both asserted by `accordion.test.js`: named uploads only, and YouTube wins
where a release exists on both platforms. Adding an entry means updating the
counts in that file (`12 rows`, `9 youtube + 3 soundcloud`).
