/* ============================================================
   serve.js
   Shared by the browser suites: serves the built dist/ on an
   ephemeral port, so no external server is needed. A URL
   argument (production, a preview) skips the local server.
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');

// The built site — what Cloudflare Pages actually serves. Run
// `npm run build` in the repo root first.
const ROOT = path.join(__dirname, '..', 'dist');

const TYPES = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.mp3': 'audio/mpeg', '.json': 'application/json', '.woff2': 'font/woff2',
    '.ttf': 'font/ttf', '.otf': 'font/otf', '.png': 'image/png', '.jpg': 'image/jpeg',
};

function serve() {
    const server = http.createServer((req, res) => {
        const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
        const file = path.join(ROOT, rel);
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404).end('not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Resolves { base, close } for either the given URL or a local dist/.
async function target(override) {
    if (override) return { base: override, close: () => {} };
    if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
        console.error('dist/ not found — run `npm run build` in the repo root first');
        process.exit(1);
    }
    const server = await serve();
    return { base: `http://127.0.0.1:${server.address().port}/index.html`, close: () => server.close() };
}

module.exports = { target };
