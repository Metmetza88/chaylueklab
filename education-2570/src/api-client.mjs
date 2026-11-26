/** เรียก API ต้นทางเดียวกัน โดยให้เบราว์เซอร์จัดการ HttpOnly cookie */
export async function api(action, {body,query={},signal}={}) {
 const url='/api/education?'+new URLSearchParams({action,...query});
 const response=await fetch(url,{
  method:body?'POST':'GET',credentials:'same-origin',signal,
  ...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})
 });
 const data=await response.json();
 if(!response.ok){const error=new Error(data.error??'ไม่สามารถเชื่อมต่อระบบได้');error.status=response.status;throw error;}
 return data;
}
/** ป้องกันสูตรในโปรแกรม Spreadsheet ก่อนส่งออก CSV */
export function toCsv(rows) {
 return '\uFEFF'+rows.map(row=>row.map(value=>{
  let cell=String(value??'');
  if(/^[\s]*[=+\-@]/.test(cell)) cell="'"+cell;
  return '"'+cell.replace(/"/g,'""')+'"';
 }).join(',')).join('\r\n');
}
export function downloadCsv(rows,name) {
 const url=URL.createObjectURL(new Blob([toCsv(rows)],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
