import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTarget,deployPreview} from '../scripts/preview-deploy.mjs';
const target={id:'prj_education_test',name:'psomnuek-education-2570',accountId:'team_kA0EAug4JrrTT6ZIc54RXcmL',rootDirectory:'education-2570',link:{repoId:1400009958}};
test('deployment guard rejects main website, wrong team/root/repository and unverified project ID',()=>{
 validateTarget(target,target.id);
 for(const change of [{id:'prj_main'},{name:'chaylueklab'},{accountId:'team_other'},{rootDirectory:null},{link:{repoId:1}}])assert.throws(()=>validateTarget({...target,...change},target.id));
 assert.throws(()=>validateTarget(target,''));
});
test('deployment guard refuses main and unconfirmed hosting before making any request',async()=>{
 let calls=0;const request=async()=>{calls++;};
 await assert.rejects(deployPreview({GITHUB_REF:'refs/heads/main'},request));
 await assert.rejects(deployPreview({GITHUB_REF:'refs/heads/feature/education-2570',EDU_PREVIEW_ENABLED:'true'},request));assert.equal(calls,0);
});
