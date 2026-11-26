(() => {
  'use strict';
  const messages = document.getElementById('messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('message');
  const quote = document.getElementById('quotation');
  const core = window.WorametInsights;
  function bubble(text, kind) {
    const node = document.createElement('div');
    node.className = 'message ' + kind;
    node.textContent = text;
    messages.append(node);
    messages.scrollTop = messages.scrollHeight;
  }
  function response(command) {
    const key = command.trim().replace(/\s+/g, ' ').toLowerCase();
    if (['เมนู', 'เริ่ม', 'เริ่มใช้งาน', 'help', 'start'].includes(key)) {
      return 'คำสั่งทดลอง:\n• สรุปยอดขายตัวอย่าง\n• ใบเสนอราคา\n• ส่งเอกสาร\n• สร้างรูป\n\nยังไม่มี AI หรือ LINE จริงเชื่อมต่อ';
    }
    if (['ทดลอง', 'demo', 'สรุปยอดขายตัวอย่าง'].includes(key)) {
      const r = core.analyze(core.sample);
      return '📊 ข้อมูลสมมติ (ไม่ใช่ยอดขายร้านจริง)\nยอดขายรวม: ฿' + core.money(r.revenueCents) + '\nขายได้: ' + r.units + ' ชิ้น\nสินค้าอันดับ 1: ' + r.rank[0].product + '\n\nคำนวณด้วยสูตร ไม่ใช่ AI';
    }
    if (key === 'ใบเสนอราคา') {
      quote.hidden = false;
      return 'เปิดใบเสนอราคาตัวอย่างด้านข้าง/ด้านล่างแล้วครับ\nสามารถกด “พิมพ์ / บันทึก PDF” เพื่อใช้เมนูพิมพ์ของอุปกรณ์\nตัวอย่างนี้ยังไม่ได้อ่านไฟล์หรือสร้างใบเสนอราคาจาก LINE';
    }
    if (key === 'ส่งเอกสาร' || key === 'สร้างรูป' || key === 'ถาม ai') {
      return 'ฟังก์ชันนี้ยังไม่เปิดใช้งานจริง ต้องเชื่อมผู้ให้บริการและตรวจค่าใช้จ่ายก่อน';
    }
    return 'ตอนนี้เป็นระบบจำลอง ลองพิมพ์ “เมนู” เพื่อดูคำสั่งที่มี';
  }
  function send(text) {
    const value = text.trim().slice(0, 160);
    if (!value) return;
    bubble(value, 'user');
    bubble(response(value), 'bot');
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    send(input.value);
    input.value = '';
    input.focus();
  });
  document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => send(button.dataset.command)));
  document.getElementById('print-quote').addEventListener('click', () => window.print());
})();
