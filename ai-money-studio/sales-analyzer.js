/* WORAMET AI LAB: offline CSV sales summary for an authorized demo.
   No remote calls; all uploaded file data stays in the local browser. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const nodes = {
    file: $("sales-file"), sample: $("sales-sample"), clear: $("sales-clear"),
    stats: $("sales-stats"), products: $("sales-products"), insights: $("sales-insights"),
    status: $("sales-status"), copy: $("sales-copy")
  };
  if (!nodes.file || !nodes.stats) return;
  const example = [
    "วันที่,สินค้า,จำนวน,ราคาต่อหน่วย",
    "2026-11-10,FIRST CHAPTER Ivory,2,600",
    "2026-11-10,FIRST CHAPTER Noir,1,600",
    "2026-11-11,FIRST CHAPTER Ivory,3,600",
    "2026-11-11,FIRST CHAPTER Forest,2,600",
    "2026-11-12,FIRST CHAPTER Noir,4,600",
    "2026-11-12,FIRST CHAPTER Forest,1,600"
  ].join("\n");
  const currency = new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB",maximumFractionDigits:2});
  const number = new Intl.NumberFormat("th-TH",{maximumFractionDigits:2});
  let lastReport = "";

  function parseCsv(source) {
    const data = String(source || "").replace(/^\uFEFF/,"");
    if (data.length > 1024 * 1024) throw Error("ไฟล์ใหญ่เกิน 1 MB");
    if (!data.trim()) throw Error("ไฟล์ว่าง");
    const firstLine = data.split(/\r?\n/,1)[0];
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i=0;i<data.length;i++) {
      const ch=data[i];
      if(ch==='"') {
        if(quoted && data[i+1]==='"') {cell+='"';i++;}
        else quoted=!quoted;
      } else if(ch===delimiter && !quoted) {
        row.push(cell);cell="";
      } else if((ch==="\n" || ch==="\r") && !quoted) {
        if(ch==="\r" && data[i+1]==="\n")i++;
        row.push(cell);cell="";
        if(row.some(x=>x.trim()!=="")) rows.push(row);
        row=[];
      } else cell+=ch;
    }
    if(quoted) throw Error("ไฟล์ CSV มีเครื่องหมายคำพูดเปิดค้าง");
    row.push(cell);
    if(row.some(x=>x.trim()!=="")) rows.push(row);
    if(rows.length<2) throw Error("ไม่พบรายการขายในไฟล์");
    return rows;
  }

  function parseSales(csv) {
    const rows=parseCsv(csv);
    const norm = (v) => String(v||"").toLowerCase().replace(/[\s_-]/g,"").trim();
    const header=rows.shift().map(norm);
    const find = (names) => header.findIndex(x=>names.some(n=>norm(n)===x));
    const columns={
      product:find(["สินค้า","ชื่อสินค้า","product","item","name"]),
      quantity:find(["จำนวน","quantity","qty"]),
      unitPrice:find(["ราคาต่อหน่วย","ราคา","unitprice","price"]),
      date:find(["วันที่","date","วัน"])
    };
    if(columns.product<0 || columns.quantity<0 || columns.unitPrice<0)
      throw Error("ต้องมีคอลัมน์ สินค้า, จำนวน, ราคาต่อหน่วย");
    const valid=[], rejected=[];
    rows.forEach((r,i)=>{
      const name=String(r[columns.product]||"").trim();
      const qty=Number(String(r[columns.quantity]||"").trim());
      const price=Number(String(r[columns.unitPrice]||"").trim().replace(/[฿,\s]/g,""));
      if(!name || !Number.isFinite(qty) || !Number.isFinite(price) || qty<=0 || price<0) {
        rejected.push(i+2);return;
      }
      valid.push({name,qty,price,date:columns.date<0?"":String(r[columns.date]||"").trim()});
    });
    if(!valid.length) throw Error("ไม่พบรายการที่ถูกต้อง: ตรวจจำนวนและราคาต่อหน่วย");
    return {valid,rejected};
  }

  function summarize(items) {
    const products=new Map();
    let total=0,units=0;
    for(const item of items) {
      const value=item.qty*item.price;
      if(!Number.isFinite(value) || value>1e12) throw Error("ยอดเงินเกินขอบเขตข้อมูลตัวอย่าง");
      total+=value; units+=item.qty;
      const prev=products.get(item.name)||{name:item.name,units:0,revenue:0,lines:0};
      prev.units+=item.qty; prev.revenue+=value;prev.lines++;
      products.set(item.name,prev);
    }
    if(!Number.isFinite(total) || total>1e13) throw Error("ยอดรวมสูงเกินขอบเขต");
    return {total,units,lines:items.length,products:[...products.values()].sort((a,b)=>b.revenue-a.revenue)};
  }

  function addStat(label,value) {
    const div=document.createElement("div");
    div.className="stat";
    const small=document.createElement("span");small.textContent=label;
    const strong=document.createElement("strong");strong.textContent=value;
    div.append(small,strong);nodes.stats.append(div);
  }

  function show(csv,isSample) {
    nodes.stats.replaceChildren();nodes.products.replaceChildren();
    nodes.copy.disabled=true;lastReport="";
    try {
      const parsed=parseSales(csv),s=summarize(parsed.valid);
      addStat("ยอดขายรวม",currency.format(s.total));
      addStat("จำนวนชิ้นที่ขาย",number.format(s.units));
      addStat("รายการข้อมูลที่ใช้",number.format(s.lines));
      addStat("สินค้าทั้งหมด",number.format(s.products.length));
      s.products.slice(0,5).forEach((p,i)=>{
        const box=document.createElement("div");box.className="result-row";
        const label=document.createElement("div");label.textContent=(i+1)+". "+p.name+" — "+currency.format(p.revenue)+" ("+number.format(p.units)+" ชิ้น)";
        const bar=document.createElement("div");bar.className="bar";
        const fill=document.createElement("span");
        fill.style.width=(s.total>0?(100*p.revenue/s.total):0).toFixed(1)+"%";
        bar.append(fill);box.append(label,bar);nodes.products.append(box);
      });
      const top=s.products[0],share=s.total>0?100*top.revenue/s.total:0;
      const tips=[];
      if(s.total===0) tips.push("ยอดรวมเป็นศูนย์ โปรดตรวจสอบราคาขายในข้อมูล");
      else if(share>=50) tips.push("ยอดขายกระจุกตัวที่ "+top.name+" คิดเป็น "+share.toFixed(1)+"% ของยอดรวม ควรติดตามความพร้อมสินค้า");
      else tips.push("ยอดขายกระจายหลายสินค้า ควรติดตามสินค้าที่มียอดสม่ำเสมอ");
      if(s.products.length>=3)tips.push("ทดลองทำคอนเทนต์สินค้าอันดับ 1–3 แล้วเปรียบเทียบผลตอบรับจริง");
      else tips.push("เพิ่มสินค้าและรายการตัวอย่างเพื่อเปรียบเทียบแนวโน้มได้ละเอียดขึ้น");
      if(parsed.rejected.length)tips.push("ข้ามรายการข้อมูลที่ไม่ถูกต้อง "+parsed.rejected.length+" แถว (แถวที่ "+parsed.rejected.slice(0,8).join(", ")+")");
      lastReport=[
        "รายงานยอดขาย — WORAMET AI LAB",
        "ยอดขายรวม: "+currency.format(s.total),
        "จำนวนสินค้า: "+number.format(s.units)+" ชิ้น จาก "+s.lines+" รายการ",
        "สินค้าขายดี: "+top.name+" ("+currency.format(top.revenue)+")",
        "ข้อสังเกต:",
        ...tips.map(t=>"- "+t),
        "หมายเหตุ: เป็นการคำนวณจาก CSV ไม่ใช่ Generative AI"
      ].join("\n");
      nodes.insights.textContent=lastReport;
      nodes.status.textContent=(isSample?"กำลังแสดงข้อมูลสมมติสำหรับสาธิต":"วิเคราะห์ไฟล์ในเครื่องแล้ว ไม่ได้อัปโหลดข้อมูล") + (parsed.rejected.length?" · ข้าม "+parsed.rejected.length+" แถว":"");
      nodes.copy.disabled=false;
    }catch(err) {
      nodes.status.textContent=err instanceof Error?err.message:"อ่านไฟล์ไม่สำเร็จ";
      nodes.insights.textContent="โปรดลองตรวจหัวตารางและข้อมูล แล้วเลือกไฟล์อีกครั้ง";
    }
  }

  nodes.sample.addEventListener("click",()=>{nodes.file.value="";show(example,true)});
  nodes.clear.addEventListener("click",()=>{
    nodes.file.value="";nodes.stats.replaceChildren();nodes.products.replaceChildren();
    nodes.insights.textContent="เลือกไฟล์หรือกด “ทดลองข้อมูลตัวอย่าง” เพื่อเริ่ม";
    nodes.status.textContent="ล้างข้อมูลบนหน้าจอแล้ว";nodes.copy.disabled=true;lastReport="";
  });
  nodes.file.addEventListener("change",async()=>{
    const file=nodes.file.files&&nodes.file.files[0];
    if(!file)return;
    if(file.size>1024*1024){nodes.status.textContent="ไฟล์ใหญ่เกิน 1 MB";return;}
    try{show(await file.text(),false);}
    catch{nodes.status.textContent="อ่านไฟล์ไม่สำเร็จ"; }
  });
  nodes.copy.addEventListener("click",async()=>{
    if(!lastReport)return;
    try{await navigator.clipboard.writeText(lastReport);nodes.status.textContent="คัดลอกสรุปแล้ว";}
    catch{nodes.status.textContent="คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกข้อความสรุปแล้วคัดลอก";}
  });
})();
