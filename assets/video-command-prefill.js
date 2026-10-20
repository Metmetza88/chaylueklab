export function consumeVideoCommand(storage,doc){
  const key='chaylueklab.creative.video';const raw=storage.getItem(key);if(!raw)return false;storage.removeItem(key);
  try{const data=JSON.parse(raw);if(typeof data.prompt!=='string'||data.prompt.length>2000)return false;
    const scene=doc.getElementById('scene');if(!scene)return false;scene.value=data.prompt;
    if(['9:16','16:9'].includes(data.ratio))doc.getElementById('ratio').value=data.ratio;
    return true;
  }catch{return false}
}
