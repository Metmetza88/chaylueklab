export const NEWSROOM_TRANSITIONS: Record<string, string[]> = {
  pitched: ['assigned', 'killed'], assigned: ['drafting', 'killed'],
  drafting: ['factcheck', 'killed'], factcheck: ['editing', 'drafting', 'killed'],
  editing: ['ready', 'drafting', 'killed'], ready: ['published', 'editing', 'killed'],
  published: [], killed: [],
};
export const NEWSROOM_CATEGORIES = ['AI', 'Tech', 'LINE', 'Meta', 'TikTok'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEXT_LIMITS: Record<string, number> = {
  title: 300, summary: 1500, body: 50000, social_copy: 8000, image_brief: 8000,
  reporter: 200, assigned_to: 200,
};

export function safeHttpUrl(value: unknown, httpsOnly = false): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return (httpsOnly ? url.protocol === 'https:' : ['http:', 'https:'].includes(url.protocol))
      && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function validSources(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.length <= 10 && value.every(source =>
    Boolean(safeHttpUrl(typeof source === 'string' ? source : source?.url)));
}
export function readyRequirements(story: any): boolean {
  return ['title', 'body', 'social_copy', 'image_brief'].every(key =>
    typeof story?.[key] === 'string' && story[key].trim().length > 0) && validSources(story?.sources);
}
export function mayPublish(story: any): boolean {
  return story?.status === 'ready' && readyRequirements(story) && story.verified === true
    && Boolean(story.owner_approved_at && story.owner_approved_by)
    && Number.isSafeInteger(story.revision) && story.revision > 0 && story.owner_approved_revision === story.revision
    && Number.isSafeInteger(story.content_revision) && story.content_revision > 0
    && story.factchecked_content_revision === story.content_revision;
}

/** Normalize editorial input; identity, approval and verified fields are never browser writable. */
export function editorialPatch(value: unknown, creating = false): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid patch');
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) {
    if (Object.hasOwn(TEXT_LIMITS, key)) {
      if (typeof field !== 'string' || field.length > TEXT_LIMITS[key]) throw new Error(`invalid ${key}`);
      out[key] = field.trim();
    } else if (key === 'sources') {
      if (!Array.isArray(field) || field.length > 10 || (field.length && !validSources(field))) throw new Error('invalid sources');
      out.sources = field.map(source => {
        const label = typeof source === 'string' ? '' : source?.label ?? '';
        if (typeof label !== 'string' || label.length > 200) throw new Error('invalid source label');
        return { url: safeHttpUrl(typeof source === 'string' ? source : source?.url), label: label.trim() };
      });
    } else if (key === 'media') {
      if (field === null) { out.media = null; continue; }
      if (!field || typeof field !== 'object' || Array.isArray(field)) throw new Error('invalid media');
      const media = field as Record<string, unknown>;
      if (Object.keys(media).some(k => !['type', 'url', 'alt'].includes(k))
        || !['image', 'video'].includes(String(media.type)) || !safeHttpUrl(media.url, true)
        || (media.alt !== undefined && (typeof media.alt !== 'string' || media.alt.length > 500))) throw new Error('invalid media');
      out.media = { type: media.type, url: safeHttpUrl(media.url, true), alt: media.alt ?? '' };
    } else if (key === 'category') {
      if (typeof field !== 'string' || !NEWSROOM_CATEGORIES.includes(field)) throw new Error('invalid category');
      out.category = field;
    } else if (creating && key === 'slug') {
      if (typeof field !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(field)) throw new Error('invalid slug');
      out.slug = field;
    } else throw new Error('unsupported field');
  }
  if (!Object.keys(out).length) throw new Error('empty patch');
  if (creating && (!out.slug || !out.category || !out.title)) throw new Error('slug, category and title required');
  return out;
}

type RpcResult = { data?: any; error?: { message?: string; code?: string } | null };
export type NewsroomDependencies = {
  env: (key: string) => string | undefined;
  verifyLine: (token: string, channelId: string) => Promise<string | null>;
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
  published: () => Promise<RpcResult>;
  getStory?: (id: string) => Promise<RpcResult>;
  workforce?: (input: { stage: string; story: Record<string, unknown>; requestId: string }) => Promise<unknown>;
};

async function readBoundedRequest(req: Request): Promise<string | null> {
  if (Number(req.headers.get('content-length')) > 100000) return null;
  if (!req.body) return '';
  const reader = req.body.getReader(), decoder = new TextDecoder();
  let total = 0, text = '';
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > 100000) { await reader.cancel(); return null; }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

export function createNewsroomHandler(deps: NewsroomDependencies) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-line-id-token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!['GET', 'POST'].includes(req.method)) return json({ error: 'method_not_allowed' }, 405);
    if (!deps.env('SUPABASE_URL') || !deps.env('SUPABASE_SERVICE_ROLE_KEY')) return json({ error: 'newsroom_not_configured' }, 503);
    try {
      if (req.method === 'GET') {
        const result = await deps.published();
        return result.error ? json({ error: 'news_unavailable' }, 503) : json(result.data ?? []);
      }
      const owner = deps.env('NEWSROOM_OWNER_LINE_ID');
      // Keep the Login audience separate from LINE channels used by other integrations.
      const channel = deps.env('LINE_LOGIN_CHANNEL_ID') || deps.env('LINE_CHANNEL_ID');
      if (!owner || !channel) return json({ error: 'owner_login_not_configured' }, 503);
      const token = req.headers.get('x-line-id-token');
      if (!token || token.length > 8192) return json({ error: 'owner_identity_required' }, 403);
      const actor = await deps.verifyLine(token, channel);
      if (actor !== owner) return json({ error: 'owner_identity_required' }, 403);
      if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'json_required' }, 415);
      const raw = await readBoundedRequest(req);
      if (raw === null) return json({ error: 'request_too_large' }, 413);
      let input: Record<string, any>;
      try { input = JSON.parse(raw); } catch { return json({ error: 'invalid_json' }, 400); }
      if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: 'invalid_request' }, 400);
      const action = input.action;
      if (!['list', 'create', 'update', 'factcheck', 'transition', 'approve', 'publish', 'workforce'].includes(action)) return json({ error: 'unknown_action' }, 400);
      const clean: Record<string, unknown> = {};
      try {
        if (action === 'list') {
          if (input.status !== undefined && !Object.hasOwn(NEWSROOM_TRANSITIONS, input.status)) throw new Error('invalid status');
          if (input.status) clean.status = input.status;
        } else if (action === 'create') {
          if (typeof input.request_id !== 'string' || !UUID.test(input.request_id)) throw new Error('request_id required');
          clean.request_id = input.request_id;
          clean.fields = editorialPatch(input.fields, true);
        } else {
          if (typeof input.story_id !== 'string' || !UUID.test(input.story_id)
            || !Number.isSafeInteger(input.expected_revision) || input.expected_revision < 1) throw new Error('story_id and expected_revision required');
          clean.story_id = input.story_id; clean.expected_revision = input.expected_revision;
          if (action === 'update') clean.patch = editorialPatch(input.patch);
          if (action === 'transition') {
            if (!Object.hasOwn(NEWSROOM_TRANSITIONS, input.to_status) || input.to_status === 'published') throw new Error('use publish action');
            clean.to_status = input.to_status;
          }
          if (action === 'factcheck') {
            if (!['verified', 'needs_revision'].includes(input.verdict)) throw new Error('invalid verdict');
            if (typeof input.note !== 'string' || input.note.trim().length < 10) throw new Error('factcheck evidence required');
            clean.verdict = input.verdict;
          }
          if (action === 'workforce') {
            if (!['reporter', 'factcheck', 'editor', 'social', 'image_brief'].includes(input.stage)
              || typeof input.request_id !== 'string' || !UUID.test(input.request_id)) throw new Error('stage and request_id required');
            clean.stage = input.stage; clean.request_id = input.request_id;
          }
          if (input.note !== undefined) {
            if (typeof input.note !== 'string' || input.note.length > 5000) throw new Error('invalid note');
            clean.note = input.note.trim();
          }
          const permitted = ['action', 'story_id', 'expected_revision', 'note', ...(action === 'update' ? ['patch'] : []),
            ...(action === 'transition' ? ['to_status'] : []), ...(action === 'factcheck' ? ['verdict'] : []),
            ...(action === 'workforce' ? ['stage', 'request_id'] : [])];
          if (Object.keys(input).some(key => !permitted.includes(key))) throw new Error('unsupported field');
        }
      } catch (error) { return json({ error: 'invalid_request', detail: error instanceof Error ? error.message : '' }, 422); }
      if (action === 'workforce') {
        if (!deps.getStory || !deps.workforce) return json({ error: 'workforce_not_configured' }, 503);
        const result = await deps.getStory(String(clean.story_id));
        if (result.error) return json({ error: 'newsroom_unavailable' }, 503);
        if (!result.data) return json({ error: 'story_not_found' }, 404);
        if (result.data.revision !== clean.expected_revision) return json({ error: 'revision_conflict' }, 409);
        try {
          const proposal = await deps.workforce({ stage: String(clean.stage), story: result.data, requestId: String(clean.request_id) });
          if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) return json({ error: 'workforce_unavailable' }, 503);
          return json({ ...proposal, story_id: result.data.id, story_revision: result.data.revision });
        } catch (error) {
          const providerError = error as { status?: unknown; code?: unknown };
          return json({ error: typeof providerError.code === 'string' ? providerError.code : 'workforce_unavailable' },
            providerError.status === 422 ? 422 : 503);
        }
      }
      const result = await deps.rpc('newsroom_owner_action', { p_action: action, p_actor: actor, p_input: clean });
      if (result.error) {
        const message = result.error.message ?? '';
        const allowed = ['revision_conflict', 'request_conflict', 'story_not_found', 'invalid_transition', 'ready_locked',
          'factcheck_required', 'ready_requirements_missing', 'owner_approval_required', 'source_requirements_missing', 'assignment_required', 'duplicate_slug'];
        const code = allowed.find(value => message.includes(value));
        return json({ error: code ?? 'newsroom_action_unavailable' }, code === 'story_not_found' ? 404 : code ? 409 : 503);
      }
      return json(action === 'list' ? result.data : { story: result.data });
    } catch { return json({ error: 'newsroom_unavailable' }, 503); }
  };
}
