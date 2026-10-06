import {mkdir,readFile,writeFile} from 'node:fs/promises';
const mappings=[['membership.ts','_shared/membership.ts'],['billing-core.ts','_shared/billing-core.ts'],['billing.ts','billing/index.ts'],['index.ts','stripe-webhook/index.ts']];
for(const [source,target] of mappings){
 const dest=new URL('../supabase/functions/'+target,import.meta.url);
 await mkdir(new URL('.',dest),{recursive:true});
 let content=await readFile(new URL('../'+source,import.meta.url),'utf8');
 if(target.endsWith('/index.ts'))content=content.replaceAll("'./membership.ts'","'../_shared/membership.ts'").replaceAll('"./membership.ts"','"../_shared/membership.ts"').replaceAll("'./billing-core.ts'","'../_shared/billing-core.ts'");
 await writeFile(dest,content);
}
