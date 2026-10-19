import {adminDb,lineIdentity,isOwner} from './_shared/membership.ts';
import {imageHandler} from './core.mjs';
Deno.serve(imageHandler({identity:lineIdentity,isOwner:(uid:string)=>isOwner(adminDb(),uid),env:(name:string)=>Deno.env.get(name)}));
