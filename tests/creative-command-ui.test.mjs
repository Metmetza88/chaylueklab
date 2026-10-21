import test from 'node:test';
import assert from 'node:assert/strict';
import {openCreativeCommand} from '../assets/creative-command.js';

function fixture(t,createResponse){
  class Element{
    children=[];listeners={};attributes={};value='';style={};
    classList={add(){},remove(){}};
    constructor(tag){this.tag=tag}
    append(...elements){this.children.push(...elements)}
    after(el){root.push(el)}
    replaceChildren(...elements){this.children=elements}
    insertBefore(el,before){this.children.splice(this.children.indexOf(before),0,el)}
    setAttribute(k,v){this.attributes[k]=v}
    addEventListener(k,fn){this.listeners[k]=fn}
    scrollIntoView(){} focus(){}
  }
  const root=[new Element('section')];root[0].id='liffCommandPanel';
  const walk=items=>items.flatMap(el=>[el,...walk(el.children)]);
  const calls=[];const originals=Object.fromEntries(['document','window','matchMedia','fetch'].map(k=>[k,globalThis[k]]));
  globalThis.document={createElement:tag=>new Element(tag),getElementById:id=>walk(root).find(el=>el.id===id)};
  globalThis.window={switchPage(){},liff:{isLoggedIn:()=>true,getAccessToken:()=>'',getIDToken:()=>''}};
  globalThis.matchMedia=()=>({matches:true});
  globalThis.fetch=async(url,init)=>{const body=JSON.parse(init.body);calls.push(body);return body.action==='status'?Response.json({ok:true,configured:true}):createResponse()};
  t.after(()=>{for(const [key,value] of Object.entries(originals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value}});
  return {calls,find:fn=>walk(root).find(fn)};
}

test('short Thai video prompt is explained locally without sending a creation request',async t=>{
  const ui=fixture(t,()=>{throw Error('Must not create a paid job')});
  openCreativeCommand('video','เท่ๆเลย');
  const button=ui.find(el=>el.tag==='button'&&el.textContent==='สร้างวิดีโอ 8 วินาที');
  await button.listeners.click();
  assert.deepEqual(ui.calls.map(c=>c.action),['status']);
  assert.match(ui.find(el=>el.attributes.role==='status').textContent,/อย่างน้อย 8/);
  assert.equal(ui.find(el=>el.tag==='textarea').minLength,8);
});

test('server prompt rejection shows the specific correction rather than a connection failure',async t=>{
  const ui=fixture(t,()=>Response.json({ok:false,error:'invalid_prompt',message:'private provider detail'},{status:400}));
  openCreativeCommand('video','โลโก้สีทองหมุนช้าๆ');
  await ui.find(el=>el.tag==='button'&&el.textContent==='สร้างวิดีโอ 8 วินาที').listeners.click();
  const status=ui.find(el=>el.attributes.role==='status').textContent;
  assert.match(status,/อย่างน้อย 8/);assert.doesNotMatch(status,/เชื่อมต่อบริการ AI ไม่สำเร็จ|private provider/);
  assert.equal(ui.calls.filter(c=>!c.action).length,1);
});
