import {parseText,inspectRows,safeCSVCell,MAX_ROWS} from './quote-flow-review.mjs';
import {importFile} from './quote-flow-importers.mjs';
const core=window.WorametQuoteFlow;
const $=id=>document.getElementById(id);
let rows=[],pages=[],kind='',sourceValid=true,busy=false,generation=0,currentStep=1,summary;
const metaIDs={seller:'seller',customer:'customer',number:'quote-number',date:'quote-date',note:'note'};
const setText=(id,text)=>{$(id).textContent=text;};
function status(text,error=false){setText('global-status',text);$('global-status').classList.toggle('error',error);}
function step(n){currentStep=n;for(let i=1;i<=3;i++)$('step-'+i).hidden=i!==n;document.querySelectorAll('.steps [data-step]').forEach(b=>{if(Number(b.dataset.step)===n)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});if(n!==1)refresh();window.scrollTo({top:0,behavior:'instant'});}
function metadata(){return Object.fromEntries(Object.entries(metaIDs).map(([k,id])=>[k,$(id).value.trim()]));}
function validMeta(m){
  if(!m.seller||!m.customer||!m.number||!/^\d{4}-\d{2}-\d{2}$/.test(m.date))return false;
  const d=new Date(m.date+'T12:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===m.date&&Number(m.date.slice(0,4))>=1900;
}
function paper(m){
  for(const k of ['seller','customer','number'])setText('paper-'+k,m[k]||'–');
  setText('paper-date',validDate(m.date)?new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(m.date+'T12:00:00Z')):'–');
  setText('paper-note',m.note);setText('paper-count',rows.length+' รายการ');
  const frag=document.createDocumentFragment();
  rows.forEach((row,i)=>{const tr=document.createElement('tr'),line=summary.lines[i];for(const v of [i+1,row.name,row.quantity,row.unit,line?core.formatCents(line.unitCents):'ต้องแก้',line?core.formatCents(line.amountCents):'ต้องแก้']){const td=document.createElement('td');td.textContent=String(v);tr.append(td);}frag.append(tr);});
  $('paper-items').replaceChildren(frag);setText('paper-total',summary.errors.length?'ยังคำนวณไม่ได้':'฿'+core.formatCents(summary.totalCents));
}
function validDate(d){const x=new Date(d+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(x.valueOf())&&x.toISOString().slice(0,10)===d;}
function refresh(){
  summary=inspectRows(rows,$('expected').value,core);
  const pageErrors=pages.filter(p=>p.issue),duplicateOK=!summary.duplicates.length||$('duplicate-confirm').checked;
  const dataOK=sourceValid&&!busy&&!pageErrors.length;
  const ready=summary.ready&&dataOK&&duplicateOK&&validMeta(metadata());
  document.body.classList.toggle('ready',ready);
  $('print').disabled=!ready;$('export-csv').disabled=!ready;$('save-draft').disabled=!rows.length||busy||!sourceValid||pageErrors.length>0;
  $('review-all').disabled=!rows.length||summary.errors.length>0||!summary.countMatches||!dataOK;
  setText('row-count',rows.length+' รายการ');setText('reviewed-count',summary.reviewed+' / '+rows.length);setText('error-count',summary.errors.length+' รายการ');setText('total',summary.errors.length?'ยังคำนวณไม่ได้':'฿'+core.formatCents(summary.totalCents));setText('list-count',rows.length);
  let countMessage='กรอกจำนวนรายการจากต้นฉบับก่อนยืนยัน';
  if(summary.countReady)countMessage=summary.countMatches?'จำนวนตรงกับต้นฉบับ '+rows.length+' / '+$('expected').value+' รายการ — ตรวจชื่อ จำนวนและราคาทุกแถวด้วย':'จำนวนไม่ตรง: อ่านได้ '+rows.length+' รายการ แต่ต้นฉบับระบุ '+$('expected').value+' รายการ กรุณาตรวจต้นฉบับ';
  if(!dataOK)countMessage=busy?'กำลังอ่านไฟล์ กรุณารอ':!sourceValid?'ไฟล์หรือข้อความใหม่ยังอ่านไม่สำเร็จ โปรดนำเข้าใหม่ก่อนออกเอกสาร':'PDF มีหน้าที่อ่านไม่ครบ: '+pageErrors.map(p=>'หน้า '+p.number).join(', ')+' ต้องใช้ไฟล์ที่มีข้อความหรือตารางฉบับครบ';
  setText('count-status',countMessage);$('count-status').classList.toggle('error',!dataOK||(summary.countReady&&!summary.countMatches));
  $('duplicates').hidden=!summary.duplicates.length;setText('duplicate-text',summary.duplicates.length?'พบรายการคล้ายกันที่แถว '+summary.duplicates.slice(0,10).map(d=>d.join(' กับ ')).join(', ')+'. ตรวจว่าต้องการเก็บซ้ำจริงหรือไม่':'');
  rows.forEach((row,i)=>{const el=$('items').children[i];if(!el)return;const err=summary.errors.find(e=>e.index===i);el.classList.toggle('invalid',Boolean(err));el.classList.toggle('checked',row.reviewed);const cb=el.querySelector('[type=checkbox]');cb.checked=row.reviewed;cb.disabled=Boolean(err)||!dataOK;const error=el.querySelector('.row-error');error.textContent=err?.message||'';error.hidden=!err;el.querySelector('.row-number').textContent=summary.lines[i]?core.formatCents(summary.lines[i].amountCents):'–';el.querySelectorAll('input:not([type=checkbox])').forEach(input=>input.setAttribute('aria-invalid',String(Boolean(err))));});
  let message=ready?'ตรวจครบ พร้อมพิมพ์ใบเสนอราคา':!dataOK?countMessage:!rows.length?'ยังไม่มีรายการ กรุณานำเข้าไฟล์':summary.errors.length?'ยังมี '+summary.errors.length+' รายการที่ต้องแก้':!summary.countMatches?'กรอกจำนวนและตรวจให้ตรงต้นฉบับ':summary.reviewed!==rows.length?'ยังไม่ได้ยืนยันตรวจ '+(rows.length-summary.reviewed)+' รายการ':!duplicateOK?'กรุณาตรวจและยืนยันรายการที่คล้ายกัน':'กรอกผู้เสนอราคา ลูกค้า เลขที่ และวันที่ให้ครบ';
  setText('review-status',message);$('review-status').classList.toggle('error',!ready);$('paper-watermark').hidden=ready;
  paper(metadata());
}
function renderRows(){
  const frag=document.createDocumentFragment();
  rows.forEach((row,index)=>{
    const root=document.createElement('div');root.className='item-row';
    const check=document.createElement('label');check.className='check-wrap';const cb=document.createElement('input');cb.type='checkbox';cb.setAttribute('aria-label','ยืนยันตรวจรายการที่ '+(index+1));cb.addEventListener('change',()=>{row.reviewed=cb.checked;refresh();});const number=document.createElement('span');number.className='row-index';number.textContent=String(index+1).padStart(2,'0');check.append(cb,number);root.append(check);
    for(const [field,label,cls] of [['name','ชื่อสินค้า','row-main'],['quantity','จำนวน','field-quantity'],['unit','หน่วย','field-unit'],['unitPrice','ราคา/หน่วย','field-price']]){
      const wrap=document.createElement('label');wrap.className=cls;const span=document.createElement('span');span.className=field==='name'?'sr-only':'field-label';span.textContent=label;const input=document.createElement('input');input.type='text';input.value=row[field]||'';input.maxLength=field==='name'?160:field==='unit'?30:24;input.setAttribute('aria-label',label+' รายการที่ '+(index+1));input.setAttribute('aria-describedby','row-error-'+index);if(field==='quantity')input.inputMode='numeric';if(field==='unitPrice')input.inputMode='decimal';input.addEventListener('input',()=>{row[field]=input.value;row.reviewed=false;$('duplicate-confirm').checked=false;refresh();});wrap.append(span,input);
      if(field==='name'){const ref=document.createElement('span');ref.className='row-ref';ref.textContent=row.ref+' · '+row.source;wrap.append(ref);}root.append(wrap);
    }
    const amount=document.createElement('span');amount.className='row-number';root.append(amount);
    const remove=document.createElement('button');remove.className='remove';remove.textContent='×';remove.type='button';remove.setAttribute('aria-label','ลบรายการที่ '+(index+1));remove.addEventListener('click',()=>{rows.splice(index,1);$('duplicate-confirm').checked=false;renderRows();refresh();});root.append(remove);
    const error=document.createElement('span');error.className='row-error';error.id='row-error-'+index;root.append(error);frag.append(root);
  });$('items').replaceChildren(frag);
}
function accept(result,expected=''){
  rows=result.rows.map(r=>{try{return {...r,unitPrice:core.formatCents(core.parsePrice(r.unitPrice)).replace(/,/g,'')};}catch{return r;}});pages=result.pages||[];kind=result.kind;sourceValid=true;busy=false;$('expected').value=result.expected??expected;$('duplicate-confirm').checked=false;
  if(result.meta)for(const[k,id]of Object.entries(metaIDs))$(id).value=result.meta[k]||'';
  setText('source-name',kind+' · '+(rows[0]?.source||'กรอกเอง'));
  const frag=document.createDocumentFragment();for(const p of pages){const item=document.createElement('span');item.textContent='หน้า '+p.number+': '+(p.issue?p.issue:p.rows+' รายการ');if(p.issue)item.className='error';frag.append(item);}$('pages').replaceChildren(frag);
  renderRows();refresh();status('อ่านได้ '+rows.length+' รายการ กรุณาตรวจเทียบต้นฉบับก่อนยืนยัน');step(2);
}
async function readFile(file){
  const ticket=++generation;sourceValid=false;busy=true;refresh();status('กำลังอ่าน '+file.name+' บนเครื่องคุณ…');
  try{const result=await importFile(file,msg=>{if(ticket===generation)status(msg);});if(ticket!==generation)return;accept(result);}
  catch(e){if(ticket!==generation)return;busy=false;sourceValid=false;status('อ่านไฟล์ไม่สำเร็จ: '+(e.message||'รูปแบบไฟล์ไม่รองรับ'),true);refresh();}
}
function download(name,type,text){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
for(const b of document.querySelectorAll('[data-step]'))b.addEventListener('click',()=>step(Number(b.dataset.step)));
$('file').addEventListener('change',e=>{const f=e.target.files?.[0];if(f)readFile(f);e.target.value='';});
$('source').addEventListener('input',()=>{generation++;sourceValid=false;busy=false;status('ข้อความเปลี่ยนแล้ว กด “อ่านตารางที่วาง” เพื่อใช้ข้อมูลล่าสุด');refresh();});
$('import').addEventListener('click',()=>{generation++;busy=false;sourceValid=false;try{accept(parseText($('source').value));}catch(e){status(e.message,true);refresh();}});
const sampleNames=['สมุดเส้นบรรทัด','สมุดตาราง','ดินสอ 2B','ปากกาน้ำเงิน','ปากกาแดง','ยางลบ','ไม้บรรทัด','กบเหลาดินสอ','แฟ้มใส','แฟ้มกระดุม','กระดาษโน้ต','คลิปหนีบกระดาษ','ซองเอกสาร','เทปใส','กาวแท่ง','ปากกาเน้นข้อความ','ปากกาดำ','สมุดวาดภาพ','กระดาษสี','ริบบิ้น','เชือกฟาง','ยางวง','ลวดเย็บกระดาษ','คลิปดำ','สติ๊กเกอร์ชื่อ','ซองพลาสติก','บัตรคำ','กระดาษแข็ง','ป้ายชื่อ','ถุงหูหิ้ว'];
$('sample').addEventListener('click',()=>{generation++;$('seller').value='ร้านตัวอย่าง';$('customer').value='โรงเรียนตัวอย่าง (ข้อมูลสมมติ)';$('quote-number').value='DEMO-001';$('note').value='ข้อมูลและราคาสมมติ ใช้สำหรับสาธิตเท่านั้น';accept(parseText(['สินค้า,จำนวน,หน่วย,ราคาต่อหน่วย',...sampleNames.map(n=>n+',2,ชิ้น,12.50')].join('\n'),'ตัวอย่างสมมติ 30 รายการ'),'30');});
$('expected').addEventListener('input',()=>{$('expected').value=$('expected').value.replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-3664));refresh();});
$('duplicate-confirm').addEventListener('change',refresh);
$('review-all').addEventListener('click',()=>{refresh();if($('review-all').disabled)return;rows.forEach(r=>r.reviewed=true);refresh();status('ยืนยันตรวจ '+rows.length+' รายการแล้ว หากแก้ไข ระบบจะให้ตรวจแถวนั้นใหม่');});
$('add').addEventListener('click',()=>{if(rows.length>=MAX_ROWS){status('รองรับสูงสุด 500 รายการ',true);return;}generation++;busy=false;rows.push({name:'',quantity:'1',unitPrice:'',unit:'',source:'กรอกเอง',ref:'รายการ '+(rows.length+1),reviewed:false});renderRows();refresh();});
for(const id of Object.values(metaIDs))$(id).addEventListener('input',refresh);
$('save-draft').addEventListener('click',()=>{refresh();if($('save-draft').disabled)return;download('quoteflow-draft.json','application/json',JSON.stringify({format:'quoteflow-draft',version:1,expected:$('expected').value,meta:metadata(),rows:rows.map(({name,quantity,unitPrice,unit})=>({name,quantity,unitPrice,unit})),disclosure:'Draft only. Review all rows again when importing.'},null,2));status('ดาวน์โหลดฉบับร่าง JSON แล้ว เลือกไฟล์นี้เพื่อนำกลับมาแก้ไขได้');});
$('export-csv').addEventListener('click',()=>{refresh();if($('export-csv').disabled)return;const matrix=[['ลำดับ','สินค้า','จำนวน','หน่วย','ราคาต่อหน่วย','รวม'],...rows.map((r,i)=>[i+1,r.name,summary.lines[i].quantity,r.unit,(summary.lines[i].unitCents/100).toFixed(2),(summary.lines[i].amountCents/100).toFixed(2)])];download('quoteflow-items.csv','text/csv;charset=utf-8','\uFEFF'+matrix.map(r=>r.map(safeCSVCell).join(',')).join('\r\n'));status('ดาวน์โหลด CSV ที่ตรวจครบแล้ว');});
$('print').addEventListener('click',()=>{refresh();if(!$('print').disabled)window.print();});window.addEventListener('beforeprint',refresh);
const dz=$('dropzone');for(const event of ['dragenter','dragover'])dz.addEventListener(event,e=>{e.preventDefault();dz.classList.add('drag');});for(const event of ['dragleave','drop'])dz.addEventListener(event,e=>{e.preventDefault();dz.classList.remove('drag');if(event==='drop'&&e.dataTransfer.files[0])readFile(e.dataTransfer.files[0]);});
const now=new Date();$('quote-date').value=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');refresh();
