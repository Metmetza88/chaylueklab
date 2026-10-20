import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveLiffCommand} from '../assets/liff-command-center.js';
import {consumeVideoCommand} from '../assets/video-command-prefill.js';
test('Thai media prompts retain exact user text without executing generation or financial commands',()=>{
  for(const input of ['สร้างรูป เสื้อสีดำ CHAYLUEKLAB 4:5','/ภาพ ภาพแมว','ทำรูป โปสเตอร์พรีเมียม']){const r=resolveLiffCommand(input);assert.equal(r.id,'image');assert.equal(r.command.action,'creative');assert(r.argument.length>0)}
  for(const input of ['สร้างวิดีโอ โปรโมตเสื้อ 9:16','ทำภาพเคลื่อนไหว กล้องค่อยๆเลื่อน'])assert.equal(resolveLiffCommand(input).id,'video');
  assert.equal(resolveLiffCommand('สร้างรูป '+('ท'.repeat(2001))),null);assert.equal(resolveLiffCommand('จ่ายเงิน 500'),null);
});
test('video handoff consumes the prompt once, preserves text and whitelists ratio',()=>{
  const map=new Map([['chaylueklab.creative.video',JSON.stringify({prompt:'สินค้า <b>ต้นฉบับ</b>',ratio:'9:16'})]]);const storage={getItem:k=>map.get(k),removeItem:k=>map.delete(k)};const fields={scene:{value:''},ratio:{value:'16:9'}};const doc={getElementById:k=>fields[k]};
  assert(consumeVideoCommand(storage,doc));assert.equal(fields.scene.value,'สินค้า <b>ต้นฉบับ</b>');assert.equal(fields.ratio.value,'9:16');assert.equal(consumeVideoCommand(storage,doc),false);
});
test('malformed handoff is discarded safely',()=>{assert.equal(consumeVideoCommand({getItem:()=>'{bad',removeItem(){}},{}),false)});
