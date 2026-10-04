/* ============================================================
   extract-react-bits.mjs
   Copies a component verbatim out of its saved React Bits brief
   (react-bits/*.md) into src/components/<Name>/<Name>.{jsx,css}.

   Takes the first fenced block after "### Full Component Source"
   and the first after "### Component CSS". Copying, not retyping,
   keeps each component identical to upstream; local changes are
   then made by hand and marked `// gxmby:` (see react-bits/PLAN.md).

       node scripts/extract-react-bits.mjs background-molten-metal
       node scripts/extract-react-bits.mjs --force <brief> …   overwrite

   Refuses to overwrite an existing file without --force, so local
   gxmby: edits are never clobbered by accident.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRIEFS = path.join(ROOT, 'react-bits');

const args = process.argv.slice(2);
const force = args.includes('--force');
const briefs = args.filter(a => a !== '--force');

if (!briefs.length) {
    console.error('usage: node scripts/extract-react-bits.mjs [--force] <brief-name> …');
    process.exit(1);
}

// First ```lang … ``` block after `heading`.
function fenceAfter(md, heading) {
    const at = md.indexOf(heading);
    if (at === -1) return null;
    const m = /```[a-z]*\n([\s\S]*?)\n```/.exec(md.slice(at));
    return m ? m[1].trimEnd() + '\n' : null;
}

let failed = false;

for (const brief of briefs) {
    const file = path.join(BRIEFS, brief.replace(/\.md$/, '') + '.md');
    const md = fs.readFileSync(file, 'utf8');

    const name = /### Component: (\w+)/.exec(md)?.[1];
    const source = fenceAfter(md, '### Full Component Source');
    const css = fenceAfter(md, '### Component CSS');
    if (!name || !source || !css) {
        console.error(`${brief}: not a React Bits brief (needs Component, Full Component Source, Component CSS)`);
        failed = true;
        continue;
    }

    const dir = path.join(ROOT, 'src', 'components', name);
    fs.mkdirSync(dir, { recursive: true });

    for (const [ext, body] of [['jsx', source], ['css', css]]) {
        const out = path.join(dir, `${name}.${ext}`);
        if (fs.existsSync(out) && !force) {
            console.error(`skip  ${path.relative(ROOT, out)} exists (use --force to overwrite)`);
            continue;
        }
        fs.writeFileSync(out, body);
        console.log(`wrote ${path.relative(ROOT, out)}`);
    }
}

process.exit(failed ? 1 : 0);
