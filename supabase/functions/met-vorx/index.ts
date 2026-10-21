import {adminDb,lineIdentity,isOwner} from '../_shared/membership.ts';
import {metHandler} from './core.mjs';
Deno.serve(metHandler({identity:lineIdentity,owner:(uid:string)=>isOwner(adminDb(),uid),env:(key:string)=>Deno.env.get(key)}));
