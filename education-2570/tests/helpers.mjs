import {createEducationHandler} from '../api/education.mjs';
export const SCHOOL='10000000-0000-4000-8000-000000000001';
export const OTHER='10000000-0000-4000-8000-000000000002';
export const USER='20000000-0000-4000-8000-000000000001';
export const env={EDU_SUPABASE_URL:'https://yobymeygbfiwlngmwjcn.supabase.co',EDU_SUPABASE_PUBLISHABLE_KEY:'test-public-key',EDU_APP_ORIGIN:'https://education.test',EDU_PLATFORM_ENABLED:'true'};
/** ตัวจำลอง HTTP สำหรับทดสอบสัญญา API โดยไม่อ้างว่าเป็นการทดสอบ Supabase จริง */
export function harness({member=true,admin=false,memberRole='teacher',fetchImpl,config=env}={}) {
 const calls=[];
 const mock=async(url,options)=>{
  calls.push({url:String(url),...options});
  if(fetchImpl)return fetchImpl(new URL(url),options);
  const path=new URL(url).pathname;
  let data=[];
  if(path==='/auth/v1/user')data={id:USER,email:'staff@example.test'};
  if(path==='/auth/v1/token')data={access_token:'session.token.test',expires_in:7200};
  if(path.endsWith('/members'))data=member?[{school_id:SCHOOL,role:memberRole}]:[];
  if(path.endsWith('/platform_admins'))data=admin?[{user_id:USER}]:[];
  if(options.method==='POST'&&path.startsWith('/rest/'))data=[{id:OTHER,...JSON.parse(options.body)}];
  return {ok:true,status:200,json:async()=>data};
 };
 const handler=createEducationHandler({env:config,fetchImpl:mock});
 return {calls,run:async(action,{method='GET',body,query={},headers={}}={})=>{
  const response={code:0,headers:{},data:null,setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(value){this.data=value;return this;}};
  await handler({method,query:{action,...query},body,headers:{cookie:'__Host-edu_session=jwt.test.token',origin:env.EDU_APP_ORIGIN,'content-type':'application/json',...headers}},response);
  return response;
 }};
}
