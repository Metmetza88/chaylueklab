import { newsroomConfig } from './newsroom-config.js';

// Public routing only; reuse the owner's existing LINE app and Supabase project.
// Credentials and staff authorization stay in the server function.
export const stockConfig = Object.freeze({
  apiUrl: new URL('stock', newsroomConfig.apiUrl).href,
  liffId: newsroomConfig.liffId,
  liffEndpointUrl: newsroomConfig.liffEndpointUrl,
  requestTimeoutMs: 25000,
  refreshIntervalMs: 2500,
  streamHealthIntervalMs: 15000,
  streamReconnectMs: 3000,
  storageNamespace: 'chaylueklab.stock.pending.v1'
});
