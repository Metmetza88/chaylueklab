import { answerQuestion, answers, sports } from './marketplace.mjs';
import { modules } from './catalog.mjs';
import { marketProductDetail } from './views.mjs';

const topSearch=document.getElementById('market-search');
const field=document.getElementById('market-search-input');
const searchToggle=document.querySelector('[data-market-search]');
const chatForm=document.getElementById('market-chat-form');
const chatInput=document.getElementById('market-chat-input');
const log=document.getElementById('market-chat-log');
const productContent=document.getElementById('market-product-content');
let updateTimer;
const returnTo = new WeakMap();
for(const dialog of document.querySelectorAll('.market-dialog')){
  dialog.addEventListener('close',()=>{
    const trigger=returnTo.get(dialog);
    returnTo.delete(dialog);
    if(trigger?.isConnected)trigger.focus({preventScroll:true});
  });
}

function openDialog(id,trigger) {
  const dialog=document.getElementById(id);
  if (!dialog.open){
    returnTo.set(dialog,trigger);
    dialog.showModal();
    dialog.scrollTop=0;
  }
}
function setSearch(open) {
  searchToggle.setAttribute('aria-expanded',String(open));
  topSearch.hidden=!open;
  if(open) {
    const ownSearch=document.getElementById('search');
    if(ownSearch) field.value=ownSearch.value;
    field.focus();
  } else {
    clearTimeout(updateTimer);
    searchToggle.focus();
  }
}
function search() {
  const ownSearch=document.getElementById('search');
  if(ownSearch) {
    ownSearch.value=field.value;
    ownSearch.dispatchEvent(new Event('input',{bubbles:true}));
  } else {
    const params=new URLSearchParams();
    if(field.value.trim())params.set('q',field.value.trim());
    location.hash=params.size?`/catalog?${params}`:'/catalog';
  }
}
function addChat(question,answer) {
  const nodes=[['market-chat-user','คุณ: '+question],['market-chat-answer',answer]];
  for(const [className,text] of nodes) {
    const item=document.createElement('p');
    item.className=className;
    item.textContent=text;
    log.appendChild(item);
  }
  while(log.childElementCount>15)log.firstElementChild.remove();
  log.scrollTop=log.scrollHeight;
}
searchToggle.addEventListener('click',()=>setSearch(topSearch.hidden));
topSearch.addEventListener('submit',event=>{event.preventDefault();clearTimeout(updateTimer);search();});
topSearch.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();setSearch(false);}});
field.addEventListener('input',event=>{
  if(event.isComposing)return;
  clearTimeout(updateTimer);
  if(document.getElementById('search'))search();
  else if(field.value.trim())updateTimer=setTimeout(search,200);
});
field.addEventListener('compositionend',()=>{if(field.value.trim())search();});
chatForm.addEventListener('submit',event=>{
  event.preventDefault();
  const question=chatInput.value.trim();
  if(!question)return;
  addChat(question,answerQuestion(question));
  chatInput.value='';
  chatInput.focus();
});
document.addEventListener('click',event=>{
  const close=event.target.closest('dialog a');
  if(close?.closest('dialog').open){
    const dialog=close.closest('dialog');
    returnTo.delete(dialog);
    dialog.close();
  }
  const control=event.target.closest('button[data-market-open],button[data-market-product],button[data-market-question],button[data-market-jump]');
  if(!control)return;
  const {marketOpen,marketProduct,marketQuestion,marketJump}=control.dataset;
  if(marketOpen)openDialog(marketOpen,control);
  if(marketProduct){
    const product=marketProduct===sports.slug?sports:modules.find(m=>m.slug===marketProduct);
    if(product){
      productContent.innerHTML=marketProductDetail(product);
      openDialog('market-product-dialog',control);
    }
  }
  if(marketQuestion && Object.hasOwn(answers,marketQuestion))addChat(control.textContent,answers[marketQuestion]);
  if(marketJump){
    const section=document.getElementById(marketJump);
    section?.focus({preventScroll:true});
    section?.scrollIntoView({block:'start'});
  }
});
export function syncMarketplace(path) {
  for(const link of document.querySelectorAll('.market-bottom a[href^="#/"], .workspace-nav-links a[href^="#/"], .workspace-link')){
    if(link.getAttribute('href')==='#'+path)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  }
  if (!topSearch.hidden && path==='/catalog'){
    const catalogField=document.getElementById('search');
    if(catalogField && document.activeElement!==field)field.value=catalogField.value;
  }
}
export const isMarketplaceSearching=()=>document.activeElement===field;
