import type {StockDependencies} from './core.ts';

type WatchOptions = {
  heartbeatMs?: number;
  lifetimeMs?: number;
  subscribeTimeoutMs?: number;
  setInterval?: typeof setInterval;
  clearInterval?: typeof clearInterval;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
};

/** Server-only Realtime bridge. Never forwards a Postgres row or credential.
 * Each connection is bounded, checks permissions and owns its cleanup. */
export function createStockWatch(client: any, options: WatchOptions = {}): NonNullable<StockDependencies['watch']> {
  const repeat = options.setInterval || setInterval;
  const stopRepeat = options.clearInterval || clearInterval;
  const later = options.setTimeout || setTimeout;
  const stopLater = options.clearTimeout || clearTimeout;
  return async ({shopId, signal, authorized}) => {
    if (!client || signal.aborted) throw new Error('stock_realtime_unavailable');
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    let closed = false;
    let busy = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let subscribeDeadline: ReturnType<typeof setTimeout> | undefined;
    let rejectSubscribe: ((reason: Error) => void) | undefined;
    const encoder = new TextEncoder();
    const channel = client.channel('stock-watch-' + crypto.randomUUID())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_variants', filter: 'shop_id=eq.' + shopId }, () => {
        if (controller && !closed) controller.enqueue(encoder.encode('event: stock_changed\ndata: {}\n\n'));
      });
    const cleanup = () => {
      if (closed) return;
      closed = true;
      if (heartbeat !== undefined) stopRepeat(heartbeat);
      if (deadline !== undefined) stopLater(deadline);
      if (subscribeDeadline !== undefined) stopLater(subscribeDeadline);
      rejectSubscribe?.(new Error('stock_realtime_unavailable'));
      rejectSubscribe = undefined;
      signal.removeEventListener('abort', cleanup);
      if (controller) { try { controller.close(); } catch { /* Reader canceled. */ } }
      void client.removeChannel(channel);
    };
    signal.addEventListener('abort', cleanup, { once: true });
    try {
      await new Promise<void>((resolve, reject) => {
        rejectSubscribe = reject;
        subscribeDeadline = later(() => reject(new Error('stock_realtime_unavailable')), options.subscribeTimeoutMs ?? 8000);
        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') { if (subscribeDeadline !== undefined) stopLater(subscribeDeadline); rejectSubscribe = undefined; resolve(); }
          if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) { cleanup(); reject(new Error('stock_realtime_unavailable')); }
        });
      });
      if (closed || signal.aborted) throw new Error('stock_realtime_unavailable');
      return new ReadableStream<Uint8Array>({
        start(output) {
          controller = output;
          output.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));
          heartbeat = repeat(async () => {
            if (closed || busy) return;
            busy = true;
            try {
              if (!await authorized()) {
                if (!closed) output.enqueue(encoder.encode('event: access_revoked\ndata: {}\n\n'));
                cleanup(); return;
              }
              if (!closed) output.enqueue(encoder.encode('event: heartbeat\ndata: {}\n\n'));
            } catch { cleanup(); }
            finally { busy = false; }
          }, options.heartbeatMs ?? 15000);
          deadline = later(cleanup, options.lifetimeMs ?? 90000);
        },
        cancel() { cleanup(); },
      });
    } catch (error) { cleanup(); throw error; }
  };
}
