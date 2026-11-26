// Education 2570 isolated backend. Node 22+, no external packages.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateQuote(body){
 if(!body||!UUID.test(body.school_id)||!Array.isArray(body.items)||body.items.length<1||body.items.length>50)throw Error('invalid quote');
 return {school_id:body.school_id,items:body.items.map(x=>{if(!x||!UUID.test(x.catalog_id)||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>1000)throw Error('invalid item');return {catalog_id:x.catalog_id,quantity:x.quantity}})};
}
export function staff(members,school){return members.some(m=>m.school_id===school&&['admin','teacher'].includes(m.role))}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const url=process.env.EDU_SUPABASE_URL,key=process.env.EDU_SUPABASE_PUBLISHABLE_KEY;
 const token=/^Bearer ([^ ]+)$/.exec(req.headers.authorization||'')?.[1];
 if(!url||!key)return res.status(503).json({error:'not configured'});
 if(!token)return res.status(401).json({error:'login required'});
 const headers={apikey:key,Authorization:'Bearer '+token};
 try{
 const auth=await fetch(url+'/auth/v1/user',{headers});
 if(!auth.ok)return res.status(401).json({error:'invalid session'});
 const user=await auth.json();
 const db=async(path)=>{const r=await fetch(url+'/rest/v1/'+path,{headers:{...headers,'Accept-Profile':'education_2570'}});if(!r.ok)throw Error('database unavailable');return r.json()};
 const members=await db('members?select=school_id,role&user_id=eq.'+encodeURIComponent(user.id));
 const action=req.query.action;
 if(req.method==='GET'&&action==='me')return res.json({id:user.id,members});
 if(req.method==='GET'&&action==='catalog')return res.json(await db('catalog?select=id,program_id,price,programs(name,description)&published=eq.true'));
 if(req.method==='GET'&&action==='quotes')return res.json(await db('quotes?select=id,school_id,status,created_at,quote_items(quantity,unit_price,program_id)'));
 if(req.method==='POST'&&action==='estimate'){
 let b;try{b=validateQuote(req.body)}catch{return res.status(400).json({error:'invalid quote'})}
 if(!staff(members,b.school_id))return res.status(403).json({error:'forbidden'});
 const rows=await db('catalog?select=id,program_id,price&published=eq.true');
 const items=[];let cents=0;
 for(const i of b.items){const p=rows.find(r=>r.id===i.catalog_id);if(!p||p.price===null)return res.status(400).json({error:'unavailable item'});const unit=Math.round(Number(p.price)*100);cents+=unit*i.quantity;items.push({program_id:p.program_id,quantity:i.quantity,unit_price:unit/100})}
 if(!Number.isSafeInteger(cents))return res.status(400).json({error:'invalid total'});
 return res.json({school_id:b.school_id,items,total:cents/100,currency:'THB',persisted:false});
 }
 return res.status(405).json({error:'unsupported operation'});
 }catch{return res.status(503).json({error:'backend unavailable'})}
}
