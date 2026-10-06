import {adminDb, isOwner} from '../_shared/membership.ts';
import {createStockHandler, type StockDependencies} from './core.ts';
import {verifyStockLineProfile} from './line-profile.ts';
import {createStockWatch} from './realtime.ts';

let db: ReturnType<typeof adminDb> | null = null;
try { db = adminDb(); } catch { /* Configuration errors return a safe 503. */ }
let key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');
try { key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || key; } catch { /* Retain valid explicit credential. */ }
const watch: NonNullable<StockDependencies['watch']> = createStockWatch(db);

Deno.serve(createStockHandler({
  env: name => name === 'SUPABASE_SERVICE_ROLE_KEY' ? (db ? key : undefined) : Deno.env.get(name),
  verifyLine: verifyStockLineProfile,
  isOwner: async id => db ? await isOwner(db, id) : false,
  rpc: async (name, args) => db ? await db.rpc(name, args).abortSignal(AbortSignal.timeout(10000)) : { error: { code: 'PGRST202' } },
  watch,
}));
