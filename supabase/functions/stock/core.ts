import type {StockLineProfile} from './line-profile.ts';
import {resolveLineLoginChannel} from '../newsroom/line-config.ts';
import {stockConfig} from '../../../data/stock-config.js';

export const STOCK_LOGIN_CHANNEL = resolveLineLoginChannel(stockConfig.liffId);
export const STOCK_CHANNELS = ['STORE', 'LINE', 'FACEBOOK', 'TIKTOK', 'SHOPEE', 'OTHER'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = ['snapshot', 'transaction', 'history', 'product_create', 'members', 'join', 'member_update', 'request_status', 'watch'];
export type StockActor = StockLineProfile & { is_app_owner: boolean };
export type StockRpcResult = { data?: any; error?: { code?: string; message?: string } | null };
export type StockDependencies = {
  env: (key: string) => string | undefined;
  verifyLine: (idToken: string, accessToken: string, channel: string) => Promise<StockLineProfile | null>;
  isOwner: (lineUserId: string) => Promise<boolean>;
  rpc: (name: string, args: Record<string, unknown>) => Promise<StockRpcResult>;
  watch?: (input: { shopId: string; actor: StockActor; shopSlug: string; signal: AbortSignal; authorized: () => Promise<boolean> }) => Promise<ReadableStream<Uint8Array>>;
};

export function stockLoginChannel(env: StockDependencies['env']): string | undefined {
  return resolveLineLoginChannel(stockConfig.liffId, env('LINE_LOGIN_CHANNEL_ID'));
}

class InputError extends Error {
  field: string;
  constructor(field: string) { super('invalid_request'); this.field = field; }
}

function text(body: Record<string, unknown>, field: string, max: number, required = false): string {
  if (body[field] === undefined && !required) return '';
  if (typeof body[field] !== 'string') throw new InputError(field);
  const value = (body[field] as string).trim();
  if (value.length > max || (required && !value) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new InputError(field);
  return value;
}
function number(body: Record<string, unknown>, field: string, min: number, max = 1000000000): number {
  const value = body[field];
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new InputError(field);
  return value as number;
}
function requestId(body: Record<string, unknown>, field = 'request_id'): string {
  const id = text(body, field, 36, true);
  if (!UUID.test(id)) throw new InputError(field);
  return id.toLowerCase();
}

/** Normalize and strictly allowlist input. The actor and product snapshots are
 * assigned server-side; quantities are authoritative only after atomic RPC. */
export function stockInput(body: Record<string, unknown>): { action: string; input: Record<string, unknown> } {
  const action = body.action;
  if (typeof action !== 'string' || !ACTIONS.includes(action)) throw new InputError('action');
  const input: Record<string, unknown> = { shop_slug: body.shop_slug === undefined ? 'main' : text(body, 'shop_slug', 64, true) };
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(String(input.shop_slug))) throw new InputError('shop_slug');
  let permitted = ['action', 'shop_slug'];
  if (['transaction', 'product_create', 'member_update', 'request_status'].includes(action)) input.request_id = requestId(body);
  if (action === 'transaction') {
    input.variant_id = requestId(body, 'variant_id');
    if (!['IN','OUT','ADJUST'].includes(String(body.type))) throw new InputError('type');
    input.type = body.type;
    if (body.type === 'ADJUST') {
      input.stock_quantity = number(body, 'stock_quantity', 0);
      input.expected_revision = number(body, 'expected_revision', 1, Number.MAX_SAFE_INTEGER);
      permitted.push('stock_quantity','expected_revision');
    } else {
      input.quantity = number(body, 'quantity', 1);
      permitted.push('quantity');
    }
    if (body.type === 'OUT') {
      if (!STOCK_CHANNELS.includes(String(body.sales_channel))) throw new InputError('sales_channel');
      input.sales_channel = body.sales_channel;
      permitted.push('sales_channel');
    } else if (body.sales_channel !== undefined && body.sales_channel !== null) throw new InputError('sales_channel');
    if (body.sales_channel === null && body.type !== 'OUT') permitted.push('sales_channel');
    for (const [key, limit] of [['order_reference',100],['customer_name',100],['note',2000]] as const) {
      if (body[key] !== undefined) input[key] = text(body, key, limit);
    }
    permitted.push('request_id','variant_id','type','order_reference','customer_name','note');
  } else if (action === 'product_create') {
    input.name = text(body, 'name', 200, true);
    input.sku = text(body, 'sku', 100, true);
    input.color = text(body, 'color', 100, true);
    input.size = text(body, 'size', 50, true);
    if (body.threshold !== undefined) input.threshold = number(body, 'threshold', 0, 1000000);
    if (body.initial_quantity !== undefined) input.initial_quantity = number(body, 'initial_quantity', 0);
    permitted.push('request_id','name','sku','color','size','threshold','initial_quantity');
  } else if (action === 'history') {
    if (body.days !== undefined && ![1,7,30].includes(body.days as number)) throw new InputError('days');
    input.days = body.days === undefined ? 1 : body.days;
    if (body.sales_channel !== undefined) {
      if (!STOCK_CHANNELS.includes(String(body.sales_channel))) throw new InputError('sales_channel');
      input.sales_channel = body.sales_channel;
    }
    permitted.push('days','sales_channel');
  } else if (action === 'member_update') {
    input.member_line_user_id = text(body, 'member_line_user_id', 128, true);
    if (!/^U[a-f0-9]{32}$/.test(String(input.member_line_user_id))) throw new InputError('member_line_user_id');
    if (!['ACTIVE','REVOKED'].includes(String(body.status)) || body.role !== 'STAFF') throw new InputError('status_or_role');
    input.status = body.status;
    input.role = 'STAFF';
    permitted.push('request_id','member_line_user_id','status','role');
  } else if (action === 'request_status') permitted.push('request_id');
  if (Object.keys(body).some(key => !permitted.includes(key))) throw new InputError('unsupported_field');
  return { action, input };
}

async function boundedBody(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw Object.assign(new Error('json_required'), { status: 415 });
  if (Number(req.headers.get('content-length')) > 16384) throw Object.assign(new Error('request_too_large'), { status: 413 });
  if (!req.body) throw Object.assign(new Error('invalid_json'), { status: 400 });
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 16384) { await reader.cancel(); throw Object.assign(new Error('request_too_large'), { status: 413 }); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of chunks) { bytes.set(part, offset); offset += part.byteLength; }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw Object.assign(new Error('invalid_json'), { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('invalid_request'), { status: 400 });
  return body as Record<string, unknown>;
}

export function stockResultError(error: StockRpcResult['error']): { error: string; status: number } | null {
  if (!error) return null;
  if (['PGRST202','42883','42P01'].includes(error.code || '')) return { error: 'stock_not_configured', status: 503 };
  const codes: Record<string, number> = { permission_denied: 403, insufficient_stock: 409, request_id_conflict: 409, request_conflict: 409, revision_conflict: 409, validation_failed: 422, shop_not_found: 404, variant_not_found: 404, member_not_found: 404, duplicate_sku: 409, duplicate_variant: 409, no_change: 409, owner_cannot_be_changed: 409 };
  const code = (error.message || '').trim();
  return Object.hasOwn(codes, code) ? { error: code, status: codes[code] } : { error: 'stock_unavailable', status: 503 };
}

function validResult(action: string, data: any): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (action === 'snapshot' || action === 'watch') return !!data.user && Array.isArray(data.variants) && !!data.summary && (data.shop === null || typeof data.shop?.id === 'string');
  if (action === 'transaction') return typeof data.transaction?.id === 'string' && typeof data.variant?.id === 'string' && typeof data.replayed === 'boolean';
  if (action === 'product_create') return typeof data.variant?.id === 'string';
  if (action === 'history') return Array.isArray(data.transactions);
  if (action === 'members') return Array.isArray(data.members);
  if (action === 'join' || action === 'member_update') return !!data.user;
  if (action === 'request_status') return typeof data.found === 'boolean';
  return false;
}

export function createStockHandler(deps: StockDependencies) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,x-line-id-token,x-line-access-token', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    if (!deps.env('SUPABASE_URL') || !deps.env('SUPABASE_SERVICE_ROLE_KEY')) return json({ error: 'stock_not_configured' }, 503);
    const channel = stockLoginChannel(deps.env);
    if (!channel) return json({ error: 'stock_login_not_configured' }, 503);
    const idToken = req.headers.get('x-line-id-token') || '';
    const accessToken = req.headers.get('x-line-access-token') || '';
    if (!idToken || !accessToken || idToken.length > 8192 || accessToken.length > 8192) return json({ error: 'line_identity_required' }, 401);
    let normalized: ReturnType<typeof stockInput>;
    try { normalized = stockInput(await boundedBody(req)); }
    catch (error) {
      if (error instanceof InputError) return json({ error: 'invalid_request', field: error.field }, 422);
      const failure = error as { message?: string; status?: number };
      return json({ error: [400,413,415].includes(failure.status || 0) ? failure.message : 'invalid_request' }, [400,413,415].includes(failure.status || 0) ? failure.status : 400);
    }
    let profile: StockLineProfile | null;
    try { profile = await deps.verifyLine(idToken, accessToken, channel); }
    catch { return json({ error: 'line_verification_unavailable' }, 503); }
    if (!profile || typeof profile.line_user_id !== 'string' || !/^U[a-f0-9]{32}$/.test(profile.line_user_id) || typeof profile.display_name !== 'string' || !profile.display_name || profile.display_name.length > 200) return json({ error: 'line_identity_required' }, 401);
    try {
      const actor: StockActor = { line_user_id: profile.line_user_id, display_name: profile.display_name, is_app_owner: await deps.isOwner(profile.line_user_id) === true };
      const { action, input } = normalized;
      const result = await deps.rpc('stock_action', { p_action: action === 'watch' ? 'snapshot' : action, p_actor: actor, p_input: input });
      const failure = stockResultError(result.error);
      if (failure) return json({ error: failure.error }, failure.status);
      if (!validResult(action, result.data)) return json({ error: 'stock_unavailable' }, 503);
      if (action !== 'watch') return json(result.data);
      if (!['OWNER','STAFF'].includes(result.data.user.role) || !result.data.shop?.id) return json({ error: 'permission_denied' }, 403);
      if (!deps.watch) return json({ error: 'stock_realtime_unavailable' }, 503);
      const authorized = async () => {
        try {
          const current = await deps.rpc('stock_action', { p_action: 'snapshot', p_actor: actor, p_input: input });
          return !current.error && current.data?.shop?.id === result.data.shop.id && ['OWNER','STAFF'].includes(current.data?.user?.role);
        } catch { return false; }
      };
      try {
        const stream = await deps.watch({ shopId: result.data.shop.id, actor, shopSlug: String(input.shop_slug), signal: req.signal, authorized });
        return new Response(stream, { headers: { ...cors, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store, no-transform' } });
      } catch { return json({ error: 'stock_realtime_unavailable' }, 503); }
    } catch { return json({ error: 'stock_unavailable' }, 503); }
  };
}
