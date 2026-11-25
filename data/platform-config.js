import { newsroomConfig } from './newsroom-config.js';

// Public routing only. Roles, prices and payments are decided by the server function.
export const platformConfig = Object.freeze({
  apiUrl: new URL('platform', newsroomConfig.apiUrl).href,
  liffId: newsroomConfig.liffId,
  requestTimeoutMs: 25000
});
