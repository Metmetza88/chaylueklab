import {adminDb,lineIdentity,isOwner} from '../_shared/membership.ts';
import {menuHandler} from './core.mjs';
Deno.serve(menuHandler({identity:lineIdentity,owner:(uid:string)=>isOwner(adminDb(),uid),env:(key:string)=>Deno.env.get(key)}));
