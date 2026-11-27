"use client";

import { useId, useRef, useState, type ReactNode, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Bell, Bot, X } from "lucide-react";
import { DOCS, LINE, QUOTE, quoteFor } from "@/lib/marketplace";

function Popup({ title, label, icon, className, children }: { title:string; label:string; icon?:ReactNode; className:string; children:ReactNode }) {
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const heading=useId();
  return <>
    <button ref={trigger} type="button" className={className} aria-label={label} aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}>{icon}<span>{label}</span></button>
    <dialog ref={dialog} className="market-popup" aria-labelledby={heading} onClose={()=>trigger.current?.focus({preventScroll:true})}
      onClick={event=>{if(event.target instanceof Element && event.target.closest("a"))dialog.current?.close();}}>
      <form method="dialog" className="market-popup-top"><button aria-label="ปิดหน้าต่าง" type="submit"><X size={21}/></button></form>
      <div className="market-popup-body"><h2 id={heading}>{title}</h2>{children}</div>
    </dialog>
  </>;
}

export function ProductQuote({ slug, name, description, features, price, ready }: {slug:string;name:string;description:string;features:string[];price:string;ready:boolean}) {
  return <Popup title={name} label="ดูรายละเอียด / ขอใบเสนอราคา" className="market-product-button" icon={<ArrowUpRight size={19}/>}>
    <p>{description}</p><ul>{features.map(item=><li key={item}>{item}</li>)}</ul>
    <p><strong>{ready?"ราคา":"ราคาเป้าหมาย"} {price}</strong>{!ready&&" · ยังไม่เปิดจำหน่าย ราคาอาจเปลี่ยนได้"}</p>
    <section className="market-procurement"><h3>การเบิกงบโครงการ</h3><p>แจ้งชื่อโครงการ ขอบเขตงาน และเอกสารที่ฝ่ายพัสดุต้องใช้ การเบิกงบขึ้นกับงบที่ได้รับอนุมัติและขั้นตอนของโรงเรียน โปรดให้ฝ่ายพัสดุตรวจสอบก่อนสั่งงาน</p><Link href={DOCS}>ดูเอกสารจัดซื้อและแบบฟอร์ม</Link></section>
    <div className="row market-popup-links"><Link className="btn" href={quoteFor(slug)}>เตรียมคำขอใบเสนอราคา</Link><Link className="btn ghost" href={`/products/${slug}`}>ดูหน้าระบบ</Link></div>
  </Popup>;
}

export function StoreAlerts({ accountsEnabled }: {accountsEnabled:boolean}) {
  return <Popup title="แจ้งเตือนและอัปเดต" label="แจ้งเตือน" icon={<Bell size={20}/>} className="market-tool market-alert">
    <p>ดูสถานะความพร้อมบนการ์ดแต่ละระบบ โปรแกรมที่อยู่ในแผนพัฒนายังไม่เปิดจำหน่าย</p>
    <div className="row market-popup-links"><Link className="btn" href="/products">ดูสถานะโปรแกรม</Link>{accountsEnabled&&<Link href="/orders">ดูสถานะคำสั่งซื้อของฉัน</Link>}<Link href="/guide">คู่มือใช้งาน</Link></div>
  </Popup>;
}

const topics = [
  ["ราคา","ดูราคาหรือราคาเป้าหมายบนการ์ดแต่ละระบบ ระบบที่ยังไม่เปิดจำหน่ายอาจเปลี่ยนราคาได้ หากต้องการติดตั้งหรือเพิ่มฟังก์ชัน ให้ระบุขอบเขตเพื่อขอใบเสนอราคา"],
  ["เบิกงบ","การเบิกงบขึ้นกับงบที่ได้รับอนุมัติและระเบียบของโรงเรียน ให้ฝ่ายพัสดุตรวจว่าต้องใช้เอกสารอะไร แล้วแจ้งชื่อโครงการและรายการเอกสารตอนขอใบเสนอราคา"],
  ["เอกสาร","สอบถามใบเสนอราคา ใบส่งของ และเอกสารผู้ขายได้ตามรายการที่ฝ่ายพัสดุของโรงเรียนขอ ดูรายละเอียดในเมนูเอกสารเบิกงบ"],
  ["กีฬาสี","MET Sport ช่วยวางแผนจัดทีมสีและบันทึกผลแข่งขัน ดูสถานะล่าสุดของระบบบนการ์ดกีฬาสี หากต้องการประเมินงาน ให้แจ้งวันจัดและจำนวนทีมสี"],
] as const;

export function StoreChat() {
  const [question,setQuestion]=useState("");
  const [messages,setMessages]=useState<Array<{q:string;a:string}>>([]);
  const log=useRef<HTMLDivElement>(null);
  function add(q:string,a:string) {
    setMessages(previous=>[...previous.slice(-5),{q,a}]);
    requestAnimationFrame(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight;});
  }
  function submit(event:FormEvent) {
    event.preventDefault();
    const q=question.trim();
    if(!q)return;
    const answer=/เบิก|งบ|budget/i.test(q)?topics[1][1]:/เอกสาร|พัสดุ|จัดซื้อ|ใบส่งของ/.test(q)?topics[2][1]:/ราคา|กี่บาท|ค่าใช้จ่าย|price/i.test(q)?topics[0][1]:/กีฬา|ทีมสี|sport/i.test(q)?topics[3][1]:"ลองเลือกเรื่องราคา กีฬาสี เอกสาร หรือการเบิกงบ หากเป็นคำถามเฉพาะโรงเรียน ติดต่อทีมงานทาง LINE ได้ครับ";
    add(q,answer);setQuestion("");
  }
  return <Popup title="ถามเรื่องราคาและการเบิกงบ" label="🤖 ถามได้เลย!" icon={<Bot size={23}/>} className="market-float-robot">
    <p className="muted">คำตอบอัตโนมัติบนหน้านี้ ไม่ส่งข้อความออกจากเว็บ กรุณาไม่ใส่ข้อมูลนักเรียน</p>
    <div className="market-chat-topics">{topics.map(([q,a])=><button key={q} type="button" onClick={()=>add(q,a)}>{q}</button>)}</div>
    <div role="log" aria-label="บทสนทนา" tabIndex={0} ref={log} className="market-chat-log">{messages.length?messages.map(({q,a},i)=><div key={i}><p>คุณ: {q}</p><p>{a}</p></div>):<p>เลือกหัวข้อหรือพิมพ์คำถามได้เลย</p>}</div>
    <form className="market-chat-form" onSubmit={submit}><input aria-label="พิมพ์คำถาม" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={180} placeholder="เช่น ต้องใช้เอกสารอะไร" required/><button className="btn">ถาม</button></form>
    <div className="row market-popup-links"><Link href={QUOTE}>ขอใบเสนอราคา</Link><Link href={DOCS}>เอกสารจัดซื้อ</Link><a href={LINE}>คุยกับทีมทาง LINE</a></div>
  </Popup>;
}

export function QuoteBrief({product}:{product:string}) {
  const [draft,setDraft]=useState("");
  const [status,setStatus]=useState("");
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    setDraft(["ขอใบเสนอราคา · CHAYLUEKLAB Software Store",...([["โรงเรียน / หน่วยงาน","school"],["โปรแกรม","product"],["โครงการและเอกสารที่ต้องใช้","scope"]] as const).map(([label,key])=>`${label}: ${String(form.get(key)??"").trim()}`)].join("\n"));
    setStatus("");
  }
  async function copy(){
    try { await navigator.clipboard.writeText(draft);setStatus("คัดลอกแล้ว เปิด LINE และวางข้อความเพื่อส่งด้วยตัวเอง"); }
    catch {setStatus("เลือกข้อความในช่องสรุปแล้วคัดลอกด้วยตัวเองได้");}
  }
  return <section id="quote" className="panel market-quote">
    <h2>เตรียมคำขอใบเสนอราคา</h2><p>กรอกข้อมูลเพื่อสร้างร่างไว้ตรวจทาน เว็บนี้ไม่ส่งร่างหรือสร้างคำสั่งซื้อให้อัตโนมัติ</p>
    <form className="stack" onSubmit={submit}>
      <label>ชื่อโรงเรียน / หน่วยงาน<input name="school" autoComplete="organization" required maxLength={160}/></label>
      <label>โปรแกรมที่สนใจ<input name="product" defaultValue={product} required maxLength={150}/></label>
      <label>โครงการและเอกสารที่ต้องใช้<textarea name="scope" rows={3} maxLength={900} placeholder="เช่น วันจัดงาน จำนวนทีมสี และเอกสารที่ฝ่ายพัสดุต้องใช้ (ไม่ต้องใส่ข้อมูลนักเรียน)"/></label>
      <button className="btn" type="submit">สร้างร่างคำขอ</button>
    </form>
    {draft&&<div className="market-quote-result"><p>ร่างคำขอ · ยังไม่ได้ส่ง</p><textarea aria-label="ร่างคำขอ" rows={5} readOnly value={draft}/><div className="row market-popup-links"><button className="btn ghost" type="button" onClick={copy}>คัดลอกร่าง</button><a className="btn" href={LINE}>เปิด LINE เพื่อส่งร่าง</a></div><p role="status">{status}</p></div>}
  </section>;
}
