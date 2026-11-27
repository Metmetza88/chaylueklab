"use client";

import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";
import { useEffect,useRef,useState,type FormEvent } from "react";
import { FileCheck2, FileText, House, LayoutGrid, MessageCircle, Search } from "lucide-react";
import { DOCS, LINE, QUOTE } from "@/lib/marketplace";
import { StoreChat } from "./MarketDialogs";

export function MarketSearch(){
  const [open,setOpen]=useState(false);
  const input=useRef<HTMLInputElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const router=useRouter();
  const path=usePathname();
  const pending=useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(()=>()=>clearTimeout(pending.current),[]);
  function destination(){
    const params=new URLSearchParams(path==="/products"?window.location.search:"");
    const value=input.current?.value.trim()??"";
    if(value)params.set("q",value);else params.delete("q");
    return params.size?`/products?${params}`:"/products";
  }
  function liveSearch(){
    clearTimeout(pending.current);
    if(path!=="/products" && !(input.current?.value.trim()))return;
    pending.current=setTimeout(()=>router.replace(destination(),{scroll:false}),240);
  }
  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    clearTimeout(pending.current);
    router.push(destination());
    setOpen(false);
  }
  return <div className="market-search-control">
    <button className="market-tool" ref={trigger} type="button" aria-label="ค้นหาโปรแกรม" aria-expanded={open} aria-controls="store-market-search" onClick={()=>{if(!open){setOpen(true);requestAnimationFrame(()=>input.current?.focus());}else {clearTimeout(pending.current);setOpen(false);}}}><Search size={21}/></button>
    <form id="store-market-search" role="search" className="market-header-search" action="/products" onSubmit={submit} hidden={!open}
      onKeyDown={e=>{if(e.key==="Escape"){clearTimeout(pending.current);setOpen(false);trigger.current?.focus();}}}>
      <input name="q" type="search" ref={input} onChange={event=>{const native=event.nativeEvent as InputEvent;if(!native.isComposing)liveSearch();}} onCompositionEnd={liveSearch} aria-label="ค้นหาใน Software Store" placeholder="ค้นหา เช่น กีฬาสี หรือ รับสมัคร" maxLength={100} enterKeyHint="search"/>
      <button className="btn" type="submit">ค้นหา</button>
    </form>
  </div>;
}

export function MarketMobileAndFloat(){
  const path=usePathname();
  const links=[
    ["/","หน้าแรก",House],
    ["/products","ระบบทั้งหมด",LayoutGrid],
    [QUOTE,"ขอใบเสนอราคา",FileText],
    [DOCS,"เอกสารเบิกงบ",FileCheck2],
    ["/contact","ติดต่อเรา",MessageCircle],
  ] as const;
  return <>
    <div className="market-float"><StoreChat/><a className="market-float-line" aria-label="แชท LINE CHAYLUEKLAB" href={LINE}><span aria-hidden="true">LINE</span></a></div>
    <nav className="market-mobile-nav" aria-label="ทางลัดบนมือถือ">
      {links.map(([href,label,Icon],i)=><Link key={href} href={href} className={i===2?"market-nav-quote":undefined} aria-current={href===path?"page":undefined}><span><Icon size={21} aria-hidden="true"/></span><span>{label}</span></Link>)}
    </nav>
  </>;
}
