#!/usr/bin/env node
// Deploy ONLY the newsroom module to the explicitly selected existing project.
// Run with SUPABASE_ACCESS_TOKEN supplied by the execution environment.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { newsroomConfig } from '../data/newsroom-config.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const project=newsroomConfig.projectRef;
const token=process.env.SUPABASE_ACCESS_TOKEN;
const channel=process.env.LINE_LOGIN_CHANNEL_ID||newsroomConfig.liffId?.split('-')[0];
const owner=process.env.NEWSROOM_OWNER_LINE_ID;
const workforceUrl=process.env.NEWSROOM_WORKFORCE_URL;
const workforceToken=process.env.NEWSROOM_WORKFORCE_TOKEN;
const mode=process.argv[2]||'--check';
if(!['--check','--deploy'].includes(mode))throw new Error('Use --check or --deploy');
if(!token){console.error('SUPABASE_ACCESS_TOKEN is required in the execution environment. No secret has been written.');process.exit(1)}
if(mode==='--deploy'&&(!/^\d+$/.test(channel||'')||!/^U[a-f0-9]{32}$/.test(owner||'')))throw new Error('Set valid LINE_LOGIN_CHANNEL_ID and NEWSROOM_OWNER_LINE_ID before any deployment changes');
if(mode==='--deploy'&&channel!==newsroomConfig.liffId?.split('-')[0])throw new Error('LINE Login channel must match the configured existing LIFF app');
if(mode==='--deploy'&&Boolean(workforceUrl)!==Boolean(workforceToken))throw new Error('Configure both workforce variables or neither before deployment');
async function api(path,body){
 const response=await fetch(`https://api.supabase.com/v1/projects/${project}${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});
 // Do not echo API bodies: an upstream error could contain credentials.
 if(!response.ok)throw new Error(`Supabase management API returned HTTP ${response.status} for ${path||'project'}`);
 return response.json();
}
const projectInfo=await api('');
if(projectInfo.id!==project)throw new Error('Project identity mismatch');
console.log(`Verified existing Supabase project ${project}`);
if(mode==='--check')process.exit(0);
const query=sql=>api('/database/query',{query:sql});
await query('create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);');
for(const version of ['202610060004','202610060005','202610060006']){
 const applied=await query(`select version from supabase_migrations.schema_migrations where version='${version}'`);
 if(Array.isArray(applied)&&applied.length){console.log(`Migration ${version} already applied`);continue}
 const name=version==='202610060004'?'newsroom':version==='202610060005'?'newsroom_approval':'newsroom_editorial';
 const sql=await readFile(resolve(root,`supabase/migrations/${version}_${name}.sql`),'utf8');
 await query(`begin;\n${sql}\ninsert into supabase_migrations.schema_migrations(version,name) values('${version}','${name}');\ncommit;`);
 console.log(`Applied newsroom migration ${version}`);
}
// Non-secret owner/channel configuration; database credentials are Supabase runtime built-ins.
const secrets=[{name:'LINE_LOGIN_CHANNEL_ID',value:channel},{name:'NEWSROOM_OWNER_LINE_ID',value:owner}];
if(workforceUrl&&workforceToken)secrets.push({name:'NEWSROOM_WORKFORCE_URL',value:workforceUrl},{name:'NEWSROOM_WORKFORCE_TOKEN',value:workforceToken});
await api('/secrets',secrets);
const result=spawnSync('npx',['--yes','supabase@2.119.0','functions','deploy','newsroom','--project-ref',project,'--no-verify-jwt'],{cwd:root,stdio:'inherit',env:process.env});
if(result.error||result.status!==0)throw new Error('Newsroom function deploy failed');
const response=await fetch(`${newsroomConfig.apiUrl}/published`,{signal:AbortSignal.timeout(20000)});
if(!response.ok)throw new Error(`Public newsroom verification returned HTTP ${response.status}`);
const stories=await response.json();
if(!Array.isArray(stories))throw new Error('Unexpected newsroom response');
console.log(`Public newsroom API verified (${stories.length} approved articles). Website deployment and an owner LINE session must still be verified.`);
