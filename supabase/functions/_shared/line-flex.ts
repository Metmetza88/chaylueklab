import { newsroomConfig } from '../../../data/newsroom-config.js';

// Presentation only. Existing handlers own identity, quotas, delivery and approvals.
export const FLEX_THEME = Object.freeze({
  background: '#090A0C', surface: '#141518', raised: '#1E1F22',
  line: '#343338', gold: '#CFB587', goldLight: '#EBD9B7',
  text: '#F2F0EB', muted: '#AAA9A5', success: '#B4D8BD',
});
type Component = Record<string, unknown>;
function text(value: string, size = 'sm', color: string = FLEX_THEME.text, extra: Component = {}): Component {
  return { type: 'text', text: value || '—', size, color, wrap: true, ...extra };
}
function liffUrl(view?: string): string {
  const url = new URL(`https://liff.line.me/${newsroomConfig.liffId}`);
  if (view) url.searchParams.set('view', view);
  return url.href;
}
function row(label: string, value: string): Component {
  return { type: 'box', layout: 'horizontal', spacing: 'md', contents: [
    text(label, 'sm', FLEX_THEME.muted, { flex: 2 }),
    text(value, 'xl', FLEX_THEME.goldLight, { flex: 1, align: 'end', weight: 'bold' }),
  ] };
}
function stat(label: string, value: number): Component {
  return { type: 'box', layout: 'vertical', flex: 1, paddingAll: '14px', cornerRadius: '12px', backgroundColor: FLEX_THEME.background, borderColor: FLEX_THEME.line, borderWidth: '1px', spacing: 'sm', contents: [
    text(label, 'xxs', FLEX_THEME.muted),
    text(String(value), '3xl', FLEX_THEME.goldLight, { weight: 'bold', adjustMode: 'shrink-to-fit' }),
  ] };
}
function shell(input: { eyebrow: string; title: string; description: string; altText: string; content: Component[]; label: string; view?: string }) {
  return {
    type: 'flex', altText: Array.from(input.altText).slice(0, 400).join(''),
    contents: {
      type: 'bubble', size: 'mega',
      styles: { hero: { backgroundColor: FLEX_THEME.background }, body: { backgroundColor: FLEX_THEME.surface }, footer: { backgroundColor: FLEX_THEME.background } },
      hero: {
        type: 'image', url: 'https://metmetza88.github.io/chaylueklab/assets/line-header.png',
        size: 'full', aspectRatio: '8:3', aspectMode: 'cover', backgroundColor: FLEX_THEME.background, animated: true,
      },
      body: { type: 'box', layout: 'vertical', paddingAll: '22px', spacing: 'md', contents: [
        text(input.eyebrow, 'xxs', FLEX_THEME.gold, { weight: 'bold' }),
        text(input.title, 'xl', FLEX_THEME.text, { weight: 'bold' }),
        text(input.description, 'xs', FLEX_THEME.muted),
        ...input.content,
      ] },
      footer: { type: 'box', layout: 'vertical', paddingAll: '18px', spacing: 'md', contents: [
        { type: 'box', layout: 'vertical', backgroundColor: FLEX_THEME.gold, cornerRadius: '12px', paddingAll: '14px', action: { type: 'uri', label: input.label, uri: liffUrl(input.view) }, contents: [text(input.label, 'sm', '#17140F', { weight: 'bold', align: 'center' })] },
        text('PERSONAL CONTROL / CHAYLUEKLAB', 'xxs', FLEX_THEME.muted, { align: 'center' }),
      ] },
    },
  };
}

export function reminderConfirmationFlex(title: string, remindAt: string) {
  const at = new Date(remindAt);
  if (!Number.isFinite(at.getTime())) throw new TypeError('Invalid reminder time');
  const date = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric' }).format(at);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(at);
  return shell({
    eyebrow: 'REMINDER / ตั้งเตือนสำเร็จ', title, altText: `ตั้งเตือนแล้ว: ${title} · ${date} ${time} น.`,
    description: 'บันทึกเรียบร้อยแล้ว ถึงเวลาจะเตือนใน LINE', label: 'เปิดงานและการเตือน',
    content: [
      { type: 'box', layout: 'vertical', paddingAll: '18px', cornerRadius: '14px', backgroundColor: FLEX_THEME.background, borderColor: FLEX_THEME.line, borderWidth: '1px', spacing: 'sm', contents: [
        text('เวลาประเทศไทย', 'xxs', FLEX_THEME.muted),
        text(time, '3xl', FLEX_THEME.goldLight, { weight: 'bold' }),
        text(date, 'sm', FLEX_THEME.text),
      ] },
      { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
        text('✓', 'sm', FLEX_THEME.success, { flex: 0 }), text('ตั้งเตือนในบัญชีของคุณแล้ว', 'xs', FLEX_THEME.muted),
      ] },
    ],
  });
}

/** Use only with real saved values, after the existing handler has committed. */
export function financeConfirmationFlex(input: { title: string; type: 'income' | 'expense'; amount: number }) {
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new TypeError('Invalid amount');
  const amount = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(input.amount);
  return shell({ eyebrow: 'MONEY / บันทึกสำเร็จ', title: input.title, description: input.type === 'income' ? 'รายรับที่บันทึกในบัญชีของคุณ' : 'รายจ่ายที่บันทึกในบัญชีของคุณ', altText: `บันทึก${input.type === 'income' ? 'รายรับ' : 'รายจ่าย'}: ${input.title} ${amount}`, label: 'เปิดบัญชีของฉัน', content: [
    { type: 'box', layout: 'vertical', backgroundColor: FLEX_THEME.background, paddingAll: '18px', cornerRadius: '14px', borderColor: FLEX_THEME.line, borderWidth: '1px', spacing: 'sm', contents: [
      text(input.type === 'income' ? 'รายรับ / THB' : 'รายจ่าย / THB', 'xxs', FLEX_THEME.muted),
      text(amount, '3xl', FLEX_THEME.goldLight, { weight: 'bold', adjustMode: 'shrink-to-fit' }),
    ] },
  ] });
}

export function dailySummaryFlex(input: { completed: number; pending: number; overdue: number }) {
  if (Object.values(input).some(value => !Number.isSafeInteger(value) || value < 0)) throw new TypeError('Invalid summary');
  return shell({ eyebrow: 'TODAY / ภาพรวมของคุณ', title: 'วันนี้ จัดการได้.', description: 'ภาพรวมจากรายการจริงในบัญชีของคุณ', altText: `วันนี้: เสร็จ ${input.completed} ค้าง ${input.pending} เลยกำหนด ${input.overdue}`, label: 'เปิดพื้นที่ของฉัน', content: [
    { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [stat('งานที่เสร็จ', input.completed), stat('งานที่ยังค้าง', input.pending)] },
    row('เลยกำหนด', String(input.overdue)),
  ] });
}
