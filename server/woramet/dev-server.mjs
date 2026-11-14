// Local-only preview of the existing app. Run from any cwd with Node.js 24+.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createAIHandler } from './ai-boundary.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const staticFiles = new Map([
  ['/woramet-mark.svg', ['ai-money-studio/woramet-mark.svg', 'image/svg+xml']],
  ['/business-insights.html', ['ai-money-studio/business-insights.html', 'text/html;charset=utf-8']],
  ['/line-demo.html', ['ai-money-studio/line-demo.html', 'text/html;charset=utf-8']],
  ['/line-demo.css', ['ai-money-studio/line-demo.css', 'text/css;charset=utf-8']],
  ['/line-demo.js', ['ai-money-studio/line-demo.js', 'text/javascript;charset=utf-8']],
  ['/business-insights.css', ['ai-money-studio/business-insights.css', 'text/css;charset=utf-8']],
  ['/business-insights-core.js', ['ai-money-studio/business-insights-core.js', 'text/javascript;charset=utf-8']],
  ['/business-insights.js', ['ai-money-studio/business-insights.js', 'text/javascript;charset=utf-8']],
  ['/index.html', ['ai-money-studio/index.html', 'text/html;charset=utf-8']],
  ['/app.js', ['ai-money-studio/app.js', 'text/javascript;charset=utf-8']],
  ['/assets/fonts/control-thai.woff2', ['assets/fonts/control-thai.woff2', 'font/woff2']]
]);
const ai = createAIHandler(); // Deliberately disabled; no env flag or key can turn this on.
export function createDevServer() {
  return createServer(async (req, res) => {
    const host = req.headers.host || '';
    if (!/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(host)) { res.writeHead(403); res.end('Local preview only'); return; }
    const url = new URL(req.url, 'http://' + host);
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };
    if (url.pathname === '/api/business-insights/ai') {
      // This preview only exposes the disabled handler; it never forwards an uploaded body.
      req.resume();
      if (!['GET', 'POST'].includes(req.method)) { res.writeHead(405, headers); res.end(); return; }
      const response = await ai(new Request(url, { method: req.method, headers: req.headers }));
      res.writeHead(response.status, { ...headers, ...Object.fromEntries(response.headers) });
      res.end(await response.text()); return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, headers); res.end(); return; }
    const entry = staticFiles.get(url.pathname === '/' ? '/business-insights.html' : url.pathname.replace(/^\/ai-money-studio(?=\/)/, ''));
    if (!entry) { res.writeHead(404, headers); res.end('Not found'); return; }
    try {
      const content = await readFile(resolve(root, entry[0]));
      res.writeHead(200, { ...headers, 'Content-Type': entry[1] });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch { res.writeHead(500, headers); res.end('Preview file unavailable'); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.WORAMET_PORT || 4173);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('WORAMET_PORT must be 1024-65535');
  createDevServer().listen(port, '127.0.0.1', () => console.log('Local preview: http://127.0.0.1:' + port + '/ai-money-studio/business-insights.html (AI disabled)'));
}
