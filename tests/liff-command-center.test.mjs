import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMMANDS,resolveLiffCommand,runLiffCommand} from '../assets/liff-command-center.js';

const page=readFileSync(new URL('../app-20261007.html',import.meta.url),'utf8');
const client=readFileSync(new URL('../assets/liff-command-center.js',import.meta.url),'utf8');

test('existing LIFF page contains command entry, accessible labels and links to its module',()=>{
  assert.match(page,/id="liffCommandPanel"/);
  for(const id of ['liffCommandHeading','liffCommandInput','liffCommandForm','liffCommandStatus','liffCommandHelp','liffCommandList'])assert.ok(page.includes('id="'+id+'"'));
  assert.match(page,/assets\/liff-commands\.css/);
  assert.match(page,/type="module" src="\.\/assets\/liff-command-center\.js/);
  assert.match(page,/data-liff-command="\/งาน"/);
  assert.match(page,/data-liff-command="\/เตือน"/);
  assert.match(page,/data-liff-command="\/AI"/);
  assert.match(page,/ส่วนพิมพ์คำสั่งในแชต LINE OA ต้องเชื่อม Messaging API Webhook/);
});

test('Thai text command parser is explicit and handles slash aliases',()=>{
  assert.equal(resolveLiffCommand('/เมนู')?.id,'menu');
  assert.equal(resolveLiffCommand(' /งาน  ')?.command.target,'tasksPage');
  assert.equal(resolveLiffCommand('/เตือน  ตรวจสินค้า')?.argument,'ตรวจสินค้า');
  assert.equal(resolveLiffCommand('เตือน ซื้อเสื้อ')?.command.action,'form');
  assert.equal(resolveLiffCommand('/เตือนประจำ')?.id,'recurring');
  assert.equal(resolveLiffCommand(' /การเงิน ')?.id,'finance');
  assert.equal(resolveLiffCommand('/บันทึกเงิน')?.id,'record');
  assert.equal(resolveLiffCommand('/ปฏิทิน')?.id,'calendar');
  assert.equal(resolveLiffCommand('/ไฟล์')?.id,'vault');
  assert.equal(resolveLiffCommand('/รายงาน')?.id,'report');
  assert.equal(resolveLiffCommand('/สมาชิก')?.id,'membership');
  assert.equal(resolveLiffCommand('/ภาพ')?.id,'image');
  assert.equal(resolveLiffCommand('/แชต AI')?.id,'chat');
  assert.equal(resolveLiffCommand('/วิดีโอ')?.id,'video');
  assert.equal(resolveLiffCommand('/ธุรกิจ')?.id,'business');
});

test('unrecognized, long and potentially unsafe text cannot become an action',()=>{
  for(const input of ['', 'สวัสดีครับ', '/ลบทั้งหมด', '/จ่ายเงิน 500', 'a'.repeat(170), null, '/เตือน '+('ท'.repeat(121))])assert.equal(resolveLiffCommand(input),null);
  assert.deepEqual(runLiffCommand(null),{ok:false,message:'ไม่พบคำสั่ง ลอง /เมนู หรือกดปุ่มด้านล่าง'});
  const html=resolveLiffCommand('/เตือน <img src=x>');
  assert.equal(html.argument,'<img src=x>');
  assert.match(client,/title\.value=argument/);
  assert.doesNotMatch(client,/innerHTML\s*=/);
});

test('only whitelisted navigation/forms; no background writes, bot replies or group actions',()=>{
  const names=new Set(COMMANDS.map(c=>c.id));
  assert.equal(names.size,COMMANDS.length);
  const allowed=new Set(['help','page','form','tools','link','creative']);
  for(const c of COMMANDS)assert.ok(allowed.has(c.action),c.id);
  assert.doesNotMatch(client,/liff\.sendMessages|source\.type\s*===?\s*['"]group['"]|\/v2\/bot\/message|\bfetch\s*\(/);
  assert.match(client,/never perform a write from a URL query parameter/);
  assert.match(client,/modal\?\.classList\.contains\('show'\)/);
  assert.match(client,/command\.after/);
});
