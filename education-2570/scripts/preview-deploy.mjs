import assert from 'node:assert/strict';
const team='team_kA0EAug4JrrTT6ZIc54RXcmL',name='psomnuek-education-2570';
/** ตรวจเป้าหมายเดิมและขอบเขต Git ก่อนสร้างเฉพาะ Preview ห้ามสร้าง Project/Production */
export function validateTarget(project,expectedId) {
 assert.ok(expectedId?.startsWith('prj_'),'Verified Education project ID required');
 assert.equal(project.id,expectedId,'Wrong project ID');
 assert.equal(project.name,name,'Wrong project name');
 assert.equal(project.accountId,team,'Wrong team');
 assert.equal(project.rootDirectory,'education-2570','Wrong root directory');
 assert.equal(String(project.link?.repoId),'1400009958','Wrong repository');
}
export async function deployPreview(env=process.env,fetchImpl=fetch) {
 assert.equal(env.GITHUB_REF,'refs/heads/feature/education-2570','Only the requested branch can deploy');
 assert.equal(env.EDU_PREVIEW_ENABLED,'true','Preview must be explicitly enabled');
 assert.equal(env.EDU_COMMERCIAL_HOSTING_CONFIRMED,'true','Owner must verify current plan permits intended use without additional spend');
 assert.ok(env.VERCEL_TOKEN,'Authorized Vercel token required');
 assert.match(env.GITHUB_SHA,/^[0-9a-f]{40}$/);
 const request=async(path,options={})=>{
  const result=await fetchImpl('https://api.vercel.com'+path+'?teamId='+team,{...options,signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+env.VERCEL_TOKEN,'Content-Type':'application/json'}});
  if(!result.ok)throw new Error('Vercel request blocked: HTTP '+result.status);
  return result.json();
 };
 const project=await request('/v9/projects/'+encodeURIComponent(name));validateTarget(project,env.EDU_VERCEL_PROJECT_ID);
 // ไม่ระบุ target เพื่อสร้าง Preview และไม่เรียก API ของ Production หรือ Alias
 const deployment=await request('/v13/deployments',{method:'POST',body:JSON.stringify({name,project:project.id,gitSource:{type:'github',repoId:'1400009958',ref:'feature/education-2570',sha:env.GITHUB_SHA}})});
 assert.ok(deployment.id&&deployment.url,'Deployment metadata missing');
 for(let attempt=0;attempt<90;attempt++){
  const state=await request('/v13/deployments/'+encodeURIComponent(deployment.id));
  if(['ERROR','CANCELED'].includes(state.readyState))throw new Error('Preview build '+state.readyState);
  if(state.readyState==='READY'){
   const url='https://'+deployment.url;
   assert.equal(new URL(url).protocol,'https:');assert.ok(new URL(url).hostname.endsWith('.vercel.app'));
   console.log(url);return url;
  }
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
 throw new Error('Preview readiness timeout');
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])await deployPreview();
