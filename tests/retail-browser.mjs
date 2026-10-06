// Compatibility entry point for the active Control Center browser suite.
// Only the suite intercepts LINE/API fixtures; production pages use the real stock API.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = resolve(root, '.' + pathname);
    if (!target.startsWith(root.endsWith(sep) ? root : root + sep)) {
      response.writeHead(404); response.end(); return;
    }
    const body = await readFile(target);
    response.setHeader('Content-Type', types[extname(target)] || 'application/octet-stream');
    response.end(body);
  } catch { response.writeHead(404); response.end(); }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
process.env.STOCK_BROWSER_BASE = `http://127.0.0.1:${server.address().port}`;
try { await import('../scripts/verify-stock-browser.mjs'); }
finally { await new Promise(resolve => server.close(resolve)); }
