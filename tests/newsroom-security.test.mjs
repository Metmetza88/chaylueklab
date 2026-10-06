import test from 'node:test';
import assert from 'node:assert/strict';
import {mayPublish,editorialPatch} from '../supabase/functions/newsroom/core.ts';
const ready={status:'ready',title:'Title',body:'Body',sources:['https://example.com'],social_copy:'Copy',image_brief:'Brief',verified:true,owner_approved_at:'2026-10-06',owner_approved_by:'owner',revision:5,owner_approved_revision:5,content_revision:2,factchecked_content_revision:2};
test('publishing requires verified current owner approval',()=>{assert.equal(mayPublish(ready),true);for(const p of [{owner_approved_at:null},{owner_approved_by:null},{verified:false},{status:'editing'},{sources:[]},{revision:6},{content_revision:3},{owner_approved_revision:null},{factchecked_content_revision:null}])assert.equal(mayPublish({...ready,...p}),false)});
test('patch cannot forge approval, publication, identity or media',()=>{for(const key of ['owner_approved_at','owner_approved_by','published_at','status','id','media'])assert.throws(()=>editorialPatch({[key]:'forged'}));assert.throws(()=>editorialPatch({sources:['javascript:alert(1)']}));assert.deepEqual(editorialPatch({title:'Safe'}),{title:'Safe'})});
