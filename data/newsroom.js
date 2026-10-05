export const NEWSROOM_STATUS = Object.freeze({
  pitched: 'เสนอข่าว', assigned: 'มอบหมายแล้ว', drafting: 'กำลังเขียน',
  factcheck: 'ตรวจข้อเท็จจริง', editing: 'เกลาต้นฉบับ', ready: 'รอเจ้าของอนุมัติ',
  published: 'เผยแพร่แล้ว', killed: 'ไม่ใช้'
});

export const NEWSROOM_ROLES = Object.freeze([
  'coordinator','reporter','fact_checker','editor','social_copy','image_brief','owner'
]);

export const NEWSROOM_BEATS = Object.freeze(['AI','Tech','LINE','Meta','TikTok']);

export const NEWSROOM_TRANSITIONS = Object.freeze({
  pitched:['assigned','killed'], assigned:['drafting','killed'], drafting:['factcheck','killed'],
  factcheck:['editing','drafting','killed'], editing:['ready','drafting','killed'],
  ready:['published','editing','killed'], published:[], killed:[]
});

export function canTransition(from, to) { return NEWSROOM_TRANSITIONS[from]?.includes(to) === true; }
export function validSources(sources) {
  return Array.isArray(sources) && sources.length > 0 && sources.length <= 10 && sources.every((s) => {
    try { return ['http:','https:'].includes(new URL(typeof s === 'string' ? s : s.url).protocol); } catch { return false; }
  });
}
export function readyRequirements(story) {
  return Boolean(story?.title?.trim() && story?.body?.trim() && validSources(story.sources)
    && story.social_copy?.trim() && story.image_brief?.trim());
}
