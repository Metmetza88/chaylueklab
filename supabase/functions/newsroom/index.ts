import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { createNewsroomHandler } from './core.ts';
import { runWorkforceStage, type WorkforceStage } from './workforce.ts';
import { resolveLineLoginChannel } from './line-config.ts';
import { newsroomConfig } from '../../../data/newsroom-config.js';

// LINE ID tokens are verified here; they are not Supabase session JWTs.
// Supabase injects its URL/service key. Neither credential is sent to the browser.
const url = Deno.env.get('SUPABASE_URL');
let key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
try { key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || key; } catch { /* Fail closed if neither built-in key is valid. */ }
const db = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
// The owner-supplied LIFF is trusted bundled public config, never request input.
// Other integrations' LINE_CHANNEL_ID remains untouched and cannot select this audience.
const loginChannel = resolveLineLoginChannel(newsroomConfig.liffId, Deno.env.get('LINE_LOGIN_CHANNEL_ID'));
Deno.serve(createNewsroomHandler({
  env: name => name === 'SUPABASE_SERVICE_ROLE_KEY' ? key
    : ['LINE_LOGIN_CHANNEL_ID', 'LINE_CHANNEL_ID'].includes(name) ? loginChannel : Deno.env.get(name),
  verifyLine: async (token, channelId) => {
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: token, client_id: channelId }),
    });
    if (!response.ok) return null;
    const identity = await response.json();
    return typeof identity.sub === 'string' ? identity.sub : null;
  },
  rpc: async (name, args) => db ? await db.rpc(name, args) : { error: { message: 'unconfigured' } },
  getStory: async id => db ? await db.from('newsroom_stories').select('*').eq('id', id).maybeSingle() : { error: { message: 'unconfigured' } },
  workforce: input => runWorkforceStage({ ...input, stage: input.stage as WorkforceStage }, { env: name => Deno.env.get(name) }),
  published: async () => db
    ? await db.from('newsroom_stories')
      .select('id,slug,category,title,summary,body,media,sources,verified,published_at')
      .eq('status', 'published').not('owner_approved_at', 'is', null).not('owner_approved_by', 'is', null)
      .eq('verified', true).order('published_at', { ascending: false }).limit(100)
    : { error: { message: 'unconfigured' } },
}));
