import { InputError, validateQuote, isSchoolStaff, calculateEstimate } from '../lib/education-core.mjs';
const PROFILE_SCHEMA = 'education_2570';
const ALLOWED_ACTIONS = new Set(['me', 'catalog', 'quotes', 'estimate']);

/** สร้าง Supabase client ที่ส่ง JWT ของผู้ใช้ต่อให้ RLS ตรวจสิทธิ์ */
export function createSupabaseClient({ url, publishableKey, accessToken, fetchImpl = fetch }) {
  const baseUrl = new URL(url);
  if (baseUrl.protocol !== 'https:') throw new Error('HTTPS required');
  const headers = { apikey: publishableKey, Authorization: `Bearer ${accessToken}` };
  return {
    async authenticate() {
      const response = await fetchImpl(new URL('/auth/v1/user', baseUrl), { headers });
      if (!response.ok) return null;
      const user = await response.json();
      return typeof user?.id === 'string' ? user : null;
    },
    async select(table, params) {
      const resourceUrl = new URL(`/rest/v1/${table}`, baseUrl);
      resourceUrl.search = params.toString();
      const response = await fetchImpl(resourceUrl, {
        headers: { ...headers, 'Accept-Profile': PROFILE_SCHEMA }
      });
      if (!response.ok) throw new Error('Supabase data request failed');
      const result = await response.json();
      if (!Array.isArray(result)) throw new Error('Unexpected Supabase response');
      return result;
    }
  };
}

/** ยอมรับเฉพาะชื่อการทำงานที่กำหนด ไม่ต่อชื่อตารางจากอินพุต */
export function extractAction(request) {
  const action = request.query?.action;
  return typeof action === 'string' && ALLOWED_ACTIONS.has(action) ? action : null;
}

/** รับคำขอ ควบคุมสิทธิ์ เรียกฐานข้อมูล และส่ง HTTP response */
export function createEducationHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async function educationHandler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!env.EDU_SUPABASE_URL || !env.EDU_SUPABASE_PUBLISHABLE_KEY) {
      return response.status(503).json({ error: 'not configured' });
    }
    const authHeader = request.headers?.authorization || '';
    const accessToken = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(authHeader)?.[1];
    if (!accessToken) return response.status(401).json({ error: 'login required' });
    const action = extractAction(request);
    if (!action || !((request.method === 'GET' && action !== 'estimate') ||
                     (request.method === 'POST' && action === 'estimate'))) {
      return response.status(405).json({ error: 'unsupported operation' });
    }
    try {
      const database = createSupabaseClient({
        url: env.EDU_SUPABASE_URL,
        publishableKey: env.EDU_SUPABASE_PUBLISHABLE_KEY,
        accessToken, fetchImpl
      });
      const user = await database.authenticate();
      if (!user) return response.status(401).json({ error: 'invalid session' });
      if (action === 'catalog') {
        const catalog = await database.select('catalog', new URLSearchParams({
          select: 'id,program_id,price,programs(name,description)', published: 'eq.true', limit: '100'
        }));
        return response.status(200).json(catalog);
      }
      const memberships = await database.select('members', new URLSearchParams({
        select: 'school_id,role', user_id: `eq.${user.id}`, limit: '100'
      }));
      if (action === 'me') return response.status(200).json({ id: user.id, members: memberships });
      if (action === 'quotes') {
        const quotes = await database.select('quotes', new URLSearchParams({
          select: 'id,school_id,status,created_at,quote_items(quantity,unit_price,program_id)',
          order: 'created_at.desc', limit: '100'
        }));
        return response.status(200).json(quotes);
      }
      let quote;
      try {
        quote = validateQuote(request.body);
      } catch (error) {
        if (error instanceof InputError) return response.status(400).json({ error: error.message });
        throw error;
      }
      if (!isSchoolStaff(memberships, quote.school_id)) {
        return response.status(403).json({ error: 'forbidden' });
      }
      const catalog = await database.select('catalog', new URLSearchParams({
        select: 'id,program_id,price', published: 'eq.true', limit: '1000'
      }));
      try {
        return response.status(200).json(calculateEstimate(quote, catalog));
      } catch (error) {
        if (error instanceof InputError) return response.status(400).json({ error: error.message });
        throw error;
      }
    } catch {
      return response.status(503).json({ error: 'backend unavailable' });
    }
  };
}
export { validateQuote } from '../lib/education-core.mjs';
export { isSchoolStaff as staff } from '../lib/education-core.mjs';
export default createEducationHandler();
