import {MAX_FILE_BYTES,MAX_ROWS,headerMap,makeRow,parseText,tableRows,validateDraft,key} from './quote-flow-review.mjs';
const MAX_EXPANDED=30*1024*1024;
async function zipDocument(buffer){
  const view=new DataView(buffer);let end=-1;
  for(let i=view.byteLength-22;i>=Math.max(0,view.byteLength-65557);i--){if(view.getUint32(i,true)===0x06054b50){end=i;break;}}
  if(end<0)throw new Error('โครงสร้างไฟล์เอกสารไม่ถูกต้อง');
  const count=view.getUint16(end+10,true),offset=view.getUint32(end+16,true);if(count>2000||count===65535)throw new Error('เอกสารซับซ้อนเกินขีดจำกัด');
  let p=offset,total=0;
  for(let i=0;i<count;i++){
    if(p+46>view.byteLength||view.getUint32(p,true)!==0x02014b50)throw new Error('โครงสร้าง ZIP ไม่ถูกต้อง');
    if(view.getUint16(p+8,true)&1)throw new Error('ไม่รองรับเอกสารเข้ารหัส');
    const size=view.getUint32(p+24,true);total+=size;
    if(size===0xffffffff||total>MAX_EXPANDED)throw new Error('เอกสารเมื่อแตกไฟล์ใหญ่เกิน 30 MB');
    p+=46+view.getUint16(p+28,true)+view.getUint16(p+30,true)+view.getUint16(p+32,true);
  }
  return window.JSZip.loadAsync(buffer,{createFolders:false});
}
const children=(node,tag)=>Array.from(node.children).filter(x=>x.localName===tag);
const descendants=(node,tag)=>Array.from(node.getElementsByTagName('*')).filter(x=>x.localName===tag);
function xml(text){const d=new DOMParser().parseFromString(text,'application/xml');if(d.getElementsByTagName('parsererror').length)throw new Error('อ่าน XML ในเอกสารไม่ได้');return d;}
async function fileXML(zip,name){const f=zip.file(name);if(!f)throw new Error('ไม่พบโครงสร้าง '+name);return xml(await f.async('string'));}
async function readDOCX(buffer,name){
  const zip=await zipDocument(buffer),doc=await fileXML(zip,'word/document.xml');
  const tables=descendants(doc,'tbl');let rows=[];
  if(!tables.length)throw new Error('Word ต้องมีตารางที่มีหัว สินค้า จำนวน และราคาต่อหน่วย (ราคาเว้นได้)');
  for(let t=0;t<tables.length;t++){
    const trs=children(tables[t],'tr');let map=null;
    for(let i=0;i<trs.length;i++){
      const cells=children(trs[i],'tc').map(c=>descendants(c,'p').map(p=>descendants(p,'t').map(x=>x.textContent).join('')).join(' ').trim());
      if(!cells.some(Boolean))continue;
      if(children(trs[i],'tc').some(c=>descendants(c,'gridSpan').length||descendants(c,'vMerge').length))throw new Error('Word มีช่องผสานในตาราง กรุณาแยกช่องหรือบันทึกเป็น CSV');
      const header=headerMap(cells);if(header){map=header;continue;}
      if(!map)throw new Error('ตาราง Word ที่ '+(t+1)+' ไม่มีหัวตารางที่รองรับ');
      rows.push(makeRow(cells,map,name,'ตาราง '+(t+1)+' แถว '+(i+1)));
    }
  }
  if(!rows.length||rows.length>MAX_ROWS)throw new Error('รองรับ 1–500 รายการ');
  return {rows,pages:[],kind:'Word DOCX (ตาราง)'};
}
async function readXLSX(buffer,name){
  const zip=await zipDocument(buffer),book=await fileXML(zip,'xl/workbook.xml');
  const sheets=descendants(book,'sheet');
  if(sheets.length!==1)throw new Error('Excel รุ่นนี้รองรับ 1 ชีต กรุณาแยกชีตที่ต้องการเป็นไฟล์ใหม่');
  const rels=await fileXML(zip,'xl/_rels/workbook.xml.rels');const rid=sheets[0].getAttribute('r:id');
  const rel=descendants(rels,'Relationship').find(x=>x.getAttribute('Id')===rid);
  const target=rel?.getAttribute('Target')||'';
  if(!target||target.includes('..')||rel?.getAttribute('TargetMode')==='External')throw new Error('ตำแหน่งชีตไม่รองรับ');
  const sheet=await fileXML(zip,target.startsWith('/')?target.slice(1):'xl/'+target);
  let strings=[];if(zip.file('xl/sharedStrings.xml'))strings=descendants(await fileXML(zip,'xl/sharedStrings.xml'),'si').map(x=>descendants(x,'t').map(y=>y.textContent).join(''));
  const matrix=[],refs=[];let width=0;
  for(const r of descendants(sheet,'row')){
    const cells=[];
    for(const c of children(r,'c')){
      if(descendants(c,'f').length)throw new Error('Excel มีสูตร กรุณาคัดลอกแล้ววางเป็นค่าเพื่อป้องกันค่าค้าง');
      const addr=c.getAttribute('r')||'',letters=addr.match(/^[A-Z]+/)?.[0];if(!letters)throw new Error('ตำแหน่งเซลล์ Excel ไม่ถูกต้อง');
      let index=0;for(const char of letters)index=index*26+char.charCodeAt(0)-64;index--;
      if(index>80)throw new Error('รองรับตาราง Excel ไม่เกิน 81 คอลัมน์');
      const raw=descendants(c,'v')[0]?.textContent??'';const type=c.getAttribute('t');
      if(type==='e')throw new Error('พบเซลล์ Excel ที่มีข้อผิดพลาด');
      cells[index]=type==='s'?(strings[Number(raw)]??''):type==='inlineStr'?descendants(c,'t').map(x=>x.textContent).join(''):raw;
    }
    if(cells.some(v=>String(v??'').trim())){matrix.push(cells);refs.push('ชีต '+sheets[0].getAttribute('name')+' แถว '+r.getAttribute('r'));width=Math.max(width,cells.length);}
  }
  if(descendants(sheet,'mergeCell').length)throw new Error('Excel มีช่องผสาน กรุณาแยกช่องก่อนนำเข้า');
  return {rows:tableRows(matrix.map(c=>Array.from({length:width},(_,i)=>c[i]??'')),name,refs),pages:[],kind:'Excel XLSX (1 ชีต)'};
}
function groupPDF(items){
  const lines=[];
  for(const item of items.filter(x=>typeof x.str==='string'&&x.str.trim()).sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4])){
    const y=item.transform[5];let line=lines.find(x=>Math.abs(x.y-y)<3);
    if(!line){line={y,parts:[]};lines.push(line);}line.parts.push({text:item.str,x:item.transform[4],width:item.width});
  }
  return lines.map(l=>{
    const parts=[];
    for(const p of l.parts.sort((a,b)=>a.x-b.x)){
      const last=parts[parts.length-1],gap=last?p.x-(last.x+last.width):Infinity;
      if(last&&gap>=-8&&gap<7){last.text+=(gap>1.2?' ':'')+p.text;last.width=Math.max(last.width,p.x+p.width-last.x);}
      else parts.push({...p});
    }
    return {...l,parts};
  });
}
export function extractPDFPage(items,page,source){
  const lines=groupPDF(items);let columns=null,rows=[];
  const pageIssue=msg=>({rows:[],page:{number:page,rows:0,issue:msg}});
  if(!lines.length)return pageIssue('หน้าไม่มีข้อความ อาจเป็นภาพสแกน ต้องอ่านด้วย OCR แยกต่างหาก');
  for(let i=0;i<lines.length;i++){
    const parts=lines[i].parts;
    const title=parts.find(p=>['name','item','description','product','สินค้า','รายการ','ชื่อสินค้า','รายการสินค้า'].includes(key(p.text)));
    const qty=parts.find(p=>['qty','quantity','จำนวน'].includes(key(p.text)));
    const price=parts.find(p=>['price','unitprice','ราคา','ราคาต่อหน่วย'].includes(key(p.text)));
    if(title&&qty&&price&&title.x<qty.x&&qty.x<price.x){
      const amount=parts.find(p=>['amount','total','รวม','รวมเงิน','จำนวนเงิน'].includes(key(p.text))&&p.x>price.x);
      const unit=parts.find(p=>['unit','หน่วย'].includes(key(p.text))&&p.x>qty.x&&p.x<price.x);
      columns={name:title.x-10,qty:qty.x-16,price:price.x-16,unit:unit?unit.x-12:null,end:amount?amount.x-16:Infinity};continue;
    }
    if(!columns)continue;
    const text=parts.map(p=>p.text).join(' ').trim();
    if(/^(?:page|หน้า)\s*\d+(?:\s*(?:of|\/|จาก)\s*\d+)?$/i.test(text))continue;
    if(/^(?:grand\s*total|subtotal|total|ยอดรวม|รวมทั้งสิ้น|รวมเป็นเงิน|หมายเหตุ|note)\b/i.test(text)||/^(?:ยอดรวม|รวมทั้งสิ้น|รวมเป็นเงิน|หมายเหตุ)/.test(text))continue;
    const field=(start,end)=>parts.filter(p=>p.x>=start&&p.x<end).map(p=>p.text).join(' ').trim();
    const name=field(columns.name,columns.qty),quantity=field(columns.qty,columns.unit??columns.price),unitPrice=field(columns.price,columns.end),unit=columns.unit===null?'':field(columns.unit,columns.price);
    rows.push({name:name||text,quantity,unitPrice,unit,source,ref:'หน้า '+page+' บรรทัด '+(i+1),reviewed:false});
  }
  if(!columns)return pageIssue('ไม่พบหัวตาราง Item / Quantity / Unit price หรือ สินค้า / จำนวน / ราคาต่อหน่วย');
  if(!rows.length)return pageIssue('ไม่พบรายการใต้หัวตาราง');
  return {rows,page:{number:page,rows:rows.length,issue:null}};
}
async function readPDF(buffer,name,onProgress){
  const pdfjs=await import('./vendor/quoteflow/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/quoteflow/pdf.worker.min.mjs',import.meta.url).href;
  const task=pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,useSystemFonts:false,stopAtErrors:true,standardFontDataUrl:new URL('./vendor/quoteflow/standard_fonts/',import.meta.url).href});
  let pdf;
  try{
    pdf=await task.promise;
    if(pdf.numPages>50)throw new Error('รองรับ PDF ไม่เกิน 50 หน้า');
    let rows=[],pages=[];
    for(let n=1;n<=pdf.numPages;n++){
      onProgress?.('กำลังอ่าน PDF หน้า '+n+' / '+pdf.numPages);
      const page=await pdf.getPage(n),content=await page.getTextContent();
      const extracted=extractPDFPage(content.items,n,name);rows.push(...extracted.rows);pages.push(extracted.page);
      if(rows.length>MAX_ROWS)throw new Error('รองรับไม่เกิน 500 รายการ');
    }
    if(!rows.length)throw new Error(pages[0]?.issue||'ไม่พบรายการใน PDF');
    return {rows,pages,kind:'PDF ที่มีข้อความ (ตรวจทุกหน้า)'};
  }catch(e){if(e.name==='PasswordException')throw new Error('PDF มีรหัสผ่าน กรุณาใช้ไฟล์ที่ปลดรหัสแล้ว');throw e;}
  finally{await task.destroy();}
}
export async function importFile(file,onProgress){
  if(file.size>MAX_FILE_BYTES)throw new Error('ไฟล์ต้องไม่เกิน 10 MB');
  const ext=file.name.split('.').pop().toLowerCase();
  if(['csv','tsv','txt'].includes(ext)){if(file.size>512*1024)throw new Error('ตารางข้อความต้องไม่เกิน 512 KB');return parseText(new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()),file.name);}
  if(ext==='json')return validateDraft(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer())));
  if(!['pdf','docx','xlsx'].includes(ext))throw new Error('รองรับ CSV, TSV, TXT, XLSX, DOCX และ PDF ที่มีข้อความ');
  const buffer=await file.arrayBuffer();
  if(ext==='pdf')return readPDF(buffer,file.name,onProgress);
  return ext==='docx'?readDOCX(buffer,file.name):readXLSX(buffer,file.name);
}
