/* Pure review logic. Exact money uses the existing QuoteFlow satang engine. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ROWS = 500;
const clean = v => String(v ?? '').normalize('NFC').trim();
export const key = v => clean(v).toLowerCase().replace(/[\s_\/.-]+/g, '');
const names = {
  name: ['name','item','product','productname','description','สินค้า','ชื่อสินค้า','รายการสินค้า','รายการ'],
  quantity: ['quantity','qty','จำนวน','จำนวนสินค้า'],
  unitPrice: ['unitprice','price','ราคาต่อหน่วย','ราคาหน่วย','ราคา'],
  unit: ['unit','หน่วย','หน่วยนับ']
};
export function headerMap(cells) {
  const result = {};
  for (const [field, aliases] of Object.entries(names)) {
    const hits = cells.map((v,i) => aliases.includes(key(v)) ? i : -1).filter(i=>i>=0);
    if (hits.length > 1) throw new Error('หัวคอลัมน์ซ้ำ: ' + field);
    if (hits.length) result[field] = hits[0];
  }
  return result.name !== undefined && result.quantity !== undefined ? result : null;
}
export function makeRow(cells, map, source, ref) {
  return { name: clean(cells[map.name]), quantity: clean(cells[map.quantity]), unitPrice: map.unitPrice === undefined ? '' : clean(cells[map.unitPrice]), unit: map.unit === undefined ? '' : clean(cells[map.unit]), source, ref, reviewed: false };
}
export function tableRows(matrix, source, references) {
  const nonempty = matrix.map((cells,i)=>({cells,i})).filter(r=>r.cells.some(v=>clean(v)));
  if (!nonempty.length) throw new Error('ไม่พบรายการในไฟล์');
  const map = headerMap(nonempty[0].cells);
  if (!map) throw new Error('ต้องมีหัวตาราง สินค้า และ จำนวน ส่วนราคาต่อหน่วยกรอกภายหลังได้');
  const width = nonempty[0].cells.length;
  const rows = nonempty.slice(1).map(({cells,i}) => {
    if(cells.length !== width) throw new Error('แถว ' + (i+1) + ' มีจำนวนช่องไม่ตรงหัวตาราง กรุณาแก้ต้นฉบับ');
    return makeRow(cells,map,source,references?.[i] || 'แถว ' + (i+1));
  });
  if(!rows.length || rows.length>MAX_ROWS) throw new Error('รองรับ 1–500 รายการ');
  return rows;
}
export function parseText(input, source='ข้อความที่วาง') {
  if(typeof input !== 'string' || new TextEncoder().encode(input).length>512*1024) throw new Error('ข้อความต้องไม่เกิน 512 KB');
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ufffd]/.test(input)) throw new Error('อ่านอักขระไม่ถูกต้อง กรุณาบันทึกเป็น UTF-8');
  const text=input.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const first=text.split('\n').find(s=>s.trim());
  if(!first) throw new Error('ยังไม่มีข้อมูล');
  // Count delimiters outside quoted fields, including two-column requests without prices.
  let quoted=false; const counts={'\t':0,';':0,',':0};
  for(let i=0;i<first.length;i++){const c=first[i];if(c==='"'){if(quoted&&first[i+1]==='"')i++;else quoted=!quoted;}else if(!quoted&&c in counts)counts[c]++;}
  const delimiter=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  if(!delimiter[1]) throw new Error('แยกคอลัมน์ด้วยแท็บ จุลภาค หรือ ; และใส่หัวตาราง');
  const matrix=[]; let cells=[], value='', state='plain', line=1, refs=[];
  function finish(){cells.push(value); matrix.push(cells);refs.push('แถว '+line);cells=[];value='';state='plain';}
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(state==='quoted') {if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else state='closed';}else{value+=c;if(c==='\n')line++;}}
    else if(c===delimiter[0]){cells.push(value);value='';state='plain';}
    else if(c==='\n'){finish();line++;}
    else if(state==='closed')throw new Error('มีข้อความต่อหลังปิดเครื่องหมายคำพูดที่แถว '+line);
    else if(c==='"'){if(value)throw new Error('เครื่องหมายคำพูดผิดรูปแบบที่แถว '+line);state='quoted';}
    else value+=c;
  }
  if(state==='quoted')throw new Error('เครื่องหมายคำพูดไม่ปิด');
  finish();return {rows:tableRows(matrix,source,refs),pages:[],kind:'CSV / ตารางข้อความ'};
}
export function inspectRows(rows, expected, core) {
  const errors=[], duplicates=[], seen=new Map(); let totalCents=0, units=0;
  const lines=rows.map((row,i)=>{
    try{if(typeof row.unit!=='string'||row.unit.length>30||/[\u0000-\u001f\u007f-\u009f\ufffd]/.test(row.unit))throw new Error('หน่วยนับอ่านไม่ถูกต้อง กรุณาตรวจต้นฉบับ');
      const result=core.calculate([row]).lines[0];totalCents+=result.amountCents;units+=result.quantity;
      const signature=key(row.name)+'|'+result.quantity+'|'+result.unitCents;
      if(seen.has(signature))duplicates.push([seen.get(signature)+1,i+1]);else seen.set(signature,i);
      return result;
    }catch(e){errors.push({index:i,message:e.message.replace(/^รายการที่ 1: /,'')});return null;}
  });
  const countReady=/^[1-9]\d{0,2}$/.test(String(expected)) && Number(expected)<=MAX_ROWS;
  const countMatches=countReady && Number(expected)===rows.length;
  const reviewed=rows.filter(r=>r.reviewed).length;
  return {lines,totalCents,units,errors,duplicates,reviewed,countReady,countMatches,
    ready:rows.length>0&&rows.length<=MAX_ROWS&&errors.length===0&&countMatches&&reviewed===rows.length};
}
export function validateDraft(data) {
  if(!data||data.format!=='quoteflow-draft'||data.version!==1||!Array.isArray(data.rows)||!data.rows.length||data.rows.length>MAX_ROWS)throw new Error('ไฟล์ฉบับร่างไม่ถูกต้องหรือรุ่นไม่รองรับ');
  const rows=data.rows.map((r,i)=>{
    if(!r||['name','quantity','unitPrice','unit'].some(k=>typeof r[k]!=='string'||r[k].length>(k==='name'?160:80)))throw new Error('ข้อมูลรายการที่ '+(i+1)+' ไม่ถูกต้อง');
    return {name:r.name,quantity:r.quantity,unitPrice:r.unitPrice,unit:r.unit,source:'ฉบับร่างที่นำเข้า',ref:'รายการ '+(i+1),reviewed:false};
  });
  const meta={};for(const k of ['seller','customer','number','date','note']){const v=data.meta?.[k]??'';if(typeof v!=='string'||v.length>1000)throw new Error('ข้อมูลเอกสารไม่ถูกต้อง');meta[k]=v;}
  return {rows,meta,expected:String(data.expected??''),pages:[],kind:'ฉบับร่าง JSON'};
}
export function safeCSVCell(v){const text=String(v??'');const safe=/^[\s]*[=+\-@]/.test(text)?"'"+text:text;return '"'+safe.replace(/"/g,'""')+'"';}
