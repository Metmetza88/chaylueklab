/** Local-only HTTP adapter for testing a future LINE webhook. Not a public deployment. */
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createLineWebhookHandler } from './line-webhook.mjs';

export function createLinePreviewServer(options = {}) {
  const handler = createLineWebhookHandler(options);
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const request = new Request(url, {
        method: req.method, headers: req.headers,
        ...(req.method === 'POST' ? { body: Readable.toWeb(req), duplex: 'half' } : {})
      });
      const response = await handler(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch { res.writeHead(500, { 'Cache-Control': 'no-store' }); res.end('preview_error'); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.WORAMET_LINE_PORT || 4174);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('WORAMET_LINE_PORT must be 1024-65535');
  const server = createLinePreviewServer({
    channelSecret: process.env.WORAMET_LINE_CHANNEL_SECRET,
    channelAccessToken: process.env.WORAMET_LINE_CHANNEL_ACCESS_TOKEN
  });
  server.listen(port, '127.0.0.1', () => {
    console.log('WORAMET LINE local preview: http://127.0.0.1:' + port + '/webhooks/line (not public)');
  });
}
