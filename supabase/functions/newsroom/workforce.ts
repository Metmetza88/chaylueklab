import { newsroomRoles, newsroomStages, newsroomWorkflow, workforcePolicy } from '../../../data/newsroom-workforce.js';

export type WorkforceStage = 'reporter' | 'factcheck' | 'editor' | 'social' | 'image_brief';
export type WorkforceInput = { stage: WorkforceStage; story: Record<string, unknown>; requestId: string };
export type WorkforceDependencies = { env: (key: string) => string | undefined; fetch?: typeof fetch };
export class WorkforceError extends Error {
  status: number;
  code: string;
  constructor(code: string, status = 503) { super(code); this.code = code; this.status = status; }
}

const OUTPUT_LIMIT = 100000;
const TIMEOUT_MS = 20000;
const EDITORIAL_FIELDS = ['id', 'revision', 'category', 'title', 'summary', 'body', 'sources', 'social_copy', 'image_brief'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function exact(value: Record<string, unknown>, keys: string[]) { if (Object.keys(value).some(key => !keys.includes(key))) throw new WorkforceError('workforce_invalid_response'); }
function content(value: unknown, max: number, optional = false): string | undefined {
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new WorkforceError('workforce_invalid_response');
  return value.trim();
}
function publicUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || (url.port && url.port !== '443')
      || host === 'localhost' || !host.includes('.') || host.endsWith('.local') || host.endsWith('.internal')
      || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return null;
    return url.href;
  } catch { return null; }
}
function sources(value: unknown): Array<{ url: string; label: string }> {
  if (!Array.isArray(value) || !value.length || value.length > 10) throw new WorkforceError('workforce_invalid_response');
  return value.map(source => {
    const url = publicUrl(typeof source === 'string' ? source : object(source) ? source.url : undefined);
    const label = typeof source === 'string' ? '' : object(source) ? source.label ?? '' : '';
    if (!url || typeof label !== 'string' || label.length > 200) throw new WorkforceError('workforce_invalid_response');
    if (object(source)) exact(source, ['url', 'label']);
    return { url, label: label.trim() };
  });
}
function validateDraft(stage: WorkforceStage, value: unknown): Record<string, unknown> {
  if (!object(value)) throw new WorkforceError('workforce_invalid_response');
  if (stage === 'reporter' || stage === 'editor') {
    exact(value, stage === 'reporter' ? ['title', 'summary', 'body', 'sources'] : ['title', 'summary', 'body']);
    return { title: content(value.title, 300), summary: content(value.summary, 1500), body: content(value.body, 50000),
      ...(stage === 'reporter' ? { sources: sources(value.sources) } : {}) };
  }
  if (stage === 'factcheck') {
    exact(value, ['recommendation', 'evidence', 'note']);
    if (!['verified', 'needs_revision'].includes(String(value.recommendation)) || !Array.isArray(value.evidence)
      || !value.evidence.length || value.evidence.length > 20) throw new WorkforceError('workforce_invalid_response');
    return { recommendation: value.recommendation, note: content(value.note, 5000), evidence: value.evidence.map(entry => {
      if (!object(entry)) throw new WorkforceError('workforce_invalid_response');
      exact(entry, ['claim', 'source_url', 'note']);
      const source = publicUrl(entry.source_url);
      if (!source) throw new WorkforceError('workforce_invalid_response');
      return { claim: content(entry.claim, 2000), source_url: source, note: content(entry.note, 2000) };
    }) };
  }
  const required = stage === 'social' ? 'social_copy' : 'image_brief';
  const optional = stage === 'social' ? 'line_copy' : 'video_brief';
  exact(value, [required, optional]);
  const extra = content(value[optional], 8000, true);
  return { [required]: content(value[required], 8000), ...(extra ? { [optional]: extra } : {}) };
}
async function boundedJson(response: Response): Promise<unknown> {
  const size = Number(response.headers.get('content-length'));
  if (size > OUTPUT_LIMIT || !response.body) throw new WorkforceError('workforce_invalid_response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > OUTPUT_LIMIT) { await reader.cancel(); throw new WorkforceError('workforce_invalid_response'); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new WorkforceError('workforce_invalid_response'); }
}

/** Draft-only boundary: never persists, verifies, approves, publishes, or sends LINE. */
export async function runWorkforceStage(input: WorkforceInput, deps: WorkforceDependencies) {
  if (!Object.hasOwn(newsroomStages, input.stage) || !UUID.test(input.requestId) || !object(input.story)) throw new WorkforceError('invalid_workforce_request', 422);
  const url = publicUrl(deps.env('NEWSROOM_WORKFORCE_URL'));
  const token = deps.env('NEWSROOM_WORKFORCE_TOKEN');
  if (!url || !token || !token.trim() || /[\r\n]/.test(token)) throw new WorkforceError('workforce_not_configured');
  const stage = newsroomStages[input.stage];
  // Only known editorial data reaches the provider. Browser identity/approval fields are excluded.
  const story = Object.fromEntries(EDITORIAL_FIELDS.filter(key => Object.hasOwn(input.story, key)).map(key => [key, input.story[key]]));
  const body = JSON.stringify({ workflow_version: newsroomWorkflow.version, stage: input.stage,
    roles: newsroomRoles.filter(role => stage.roles.includes(role.id)),
    instructions: `${workforcePolicy}\n${stage.instruction}`,
    capabilities: { tools: false, publish: false, send_line: false, approve: false },
    input_kind: 'untrusted_editorial_data', story });
  if (new TextEncoder().encode(body).length > OUTPUT_LIMIT) throw new WorkforceError('workforce_input_too_large', 422);
  let response: Response;
  try {
    response = await (deps.fetch ?? fetch)(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Idempotency-Key': input.requestId }, body });
    if (!response.ok) throw new WorkforceError('workforce_provider_unavailable');
    if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new WorkforceError('workforce_invalid_response');
    const output = await boundedJson(response);
    if (!object(output)) throw new WorkforceError('workforce_invalid_response');
    exact(output, ['stage', 'draft', 'provider_request_id']);
    if (output.stage !== input.stage) throw new WorkforceError('workforce_invalid_response');
    const providerId = content(output.provider_request_id, 200, true);
    return { stage: input.stage, draft: validateDraft(input.stage, output.draft), approval_required: true as const,
      ...(providerId ? { provider_request_id: providerId } : {}) };
  } catch (error) {
    if (error instanceof WorkforceError) throw error;
    throw new WorkforceError('workforce_provider_unavailable');
  }
}
