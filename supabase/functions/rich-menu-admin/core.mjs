const API='https://api.line.me/v2/bot';
export function menuDefinition(){
  const links=[['LIFE OS','https://liff.line.me/2011681452-yexLrODy'],['MET VORX','https://liff.line.me/2011681452-yexLrODy?view=met'],['AI Studio','https://liff.line.me/2011681452-yexLrODy?view=studio'],['ร้านค้า','https://chaylueklab.com/collection/'],['เว็บไซต์','https://chaylueklab.com/'],['ติดต่อแอดมิน','https://line.me/R/oaMessage/@125cbuuu/']];
  return {size:{width:1527,height:1030},selected:true,name:'CHAYLUEKLAB Dark Premium 20261020 — draft',chatBarText:'CHAYLUEKLAB',areas:links.map(([label,uri],i)=>({bounds:{x:(i%3)*509,y:Math.floor(i/3)*515,width:509,height:515},action:{type:'uri',label,uri}}))};
}
export function menuHandler({identity,owner,env,request=fetch}){
  return async req=>{
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
    const reply=(body,status=200)=>Response.json(body,{status,headers});
    if(req.method==='OPTIONS')return new Response('ok',{headers});
    if(req.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
    let body;try{const raw=await req.text();if(raw.length>1500000)return reply({ok:false,error:'payload_too_large'},413);body=JSON.parse(raw)}catch{return reply({ok:false,error:'invalid_json'},400)}
    try{
      const uid=await identity(body);if(!uid)return reply({ok:false,error:'invalid_line_login'},401);
      if(!await owner(uid))return reply({ok:false,error:'owner_only'},403);
      const token=env('LINE_CHANNEL_ACCESS_TOKEN');if(!token)return reply({ok:false,error:'line_token_missing'},503);
      const get=async path=>{const r=await request(API+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});if(r.status===404)return null;if(!r.ok)throw Error('line_read_failed');return r.json()};
      const bot=await get('/info');if(bot?.basicId!=='@125cbuuu')return reply({ok:false,error:'wrong_line_account'},409);
      if(body.action==='backup'){
        const [list,defaultMenu,userMenu]=await Promise.all([get('/richmenu/list'),get('/user/all/richmenu'),get('/user/'+encodeURIComponent(uid)+'/richmenu')]);
        const ids=[...new Set([defaultMenu?.richMenuId,userMenu?.richMenuId].filter(Boolean))];
        const images=[];
        for(const id of ids){const r=await request('https://api-data.line.me/v2/bot/richmenu/'+encodeURIComponent(id)+'/content',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('menu_image_backup_failed');const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>1100000)throw Error('menu_image_too_large');let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));images.push({richMenuId:id,mimeType:r.headers.get('content-type'),base64:btoa(binary)})}
        return reply({ok:true,backup:{account:bot.basicId,observedAt:new Date().toISOString(),defaultMenuId:defaultMenu?.richMenuId||null,ownerMenuId:userMenu?.richMenuId||null,menus:list?.richmenus||[],images}});
      }
      if(body.action==='draft'){
        // Creates and uploads an UNLINKED draft only. This handler has no activation,
        // deletion, default-menu update, alias update or user-linking operation.
        const image=body.image;if(typeof image!=='string'||image.length>1400000||!/^[A-Za-z0-9+/]+={0,2}$/.test(image))return reply({ok:false,error:'invalid_image'},400);
        const decoded=atob(image);const bytes=Uint8Array.from(decoded,c=>c.charCodeAt(0));if(bytes.length>1000000||bytes[0]!==255||bytes[1]!==216)return reply({ok:false,error:'invalid_jpeg'},400);
        const definition=menuDefinition();
        const post=async(path,data)=>request(API+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});
        if(!(await post('/richmenu/validate',definition)).ok)return reply({ok:false,error:'invalid_menu_definition'},400);
        const created=await post('/richmenu',definition);if(!created.ok)return reply({ok:false,error:'draft_create_failed'},502);const {richMenuId}=await created.json();
        if(!/^richmenu-[a-z0-9]+$/i.test(richMenuId))throw Error('invalid_menu_id');
        const uploaded=await request('https://api-data.line.me/v2/bot/richmenu/'+richMenuId+'/content',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'image/jpeg'},body:bytes,signal:AbortSignal.timeout(20000)});
        if(!uploaded.ok)return reply({ok:false,error:'draft_image_failed',richMenuId,linked:false},502);
        return reply({ok:true,richMenuId,linked:false,definition});
      }
      return reply({ok:false,error:'unsupported_action'},400);
    }catch{return reply({ok:false,error:'menu_service_error'},502)}
  };
}
