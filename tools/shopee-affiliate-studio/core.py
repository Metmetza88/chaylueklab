"""CHAYLUEKLAB Affiliate AI Studio: local-only business logic."""
from __future__ import annotations

import csv
import io
import json
import os
import re
import sqlite3
import sys
import textwrap
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

APP_NAME = "CHAYLUEKLAB Affiliate AI Studio"
SEED_LINKS = (
    ("Shopee · ลิงก์สินค้า 1 (รอตรวจสอบ)", "https://th.shp.ee/kP7FDaXe"),
    ("Shopee · ลิงก์สินค้า 2 (รอตรวจสอบ)", "https://th.shp.ee/pBmscvyW"),
)


def app_home() -> Path:
    override = os.environ.get("CHAYLUEKLAB_STUDIO_HOME")
    if override:
        return Path(override).expanduser().resolve()
    base = os.environ.get("LOCALAPPDATA") or str(Path.home() / ".local" / "share")
    return Path(base) / "CHAYLUEKLAB" / "AffiliateAIStudio"


def now() -> str:
    return datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S")


def db_connect(home: Path) -> sqlite3.Connection:
    home.mkdir(parents=True, exist_ok=True)
    (home / "outputs").mkdir(exist_ok=True)
    (home / "images").mkdir(exist_ok=True)
    conn = sqlite3.connect(home / "studio.db", check_same_thread=False, timeout=20)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL DEFAULT 0, rate REAL NOT NULL DEFAULT 0, url TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '', image TEXT NOT NULL DEFAULT '',
      verified INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, created_at TEXT NOT NULL,
      content TEXT NOT NULL, engine TEXT NOT NULL
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, source_key TEXT UNIQUE NOT NULL,
      order_label TEXT NOT NULL DEFAULT '', event_date TEXT NOT NULL DEFAULT '', amount REAL NOT NULL,
      imported_at TEXT NOT NULL
    )""")
    conn.execute("CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    seeded=conn.execute("SELECT value FROM metadata WHERE key=?",("seeded",)).fetchone()
    if seeded is None:
        if conn.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
            for name, url in SEED_LINKS:
                conn.execute("INSERT INTO products (name,url,created_at,updated_at) VALUES (?,?,?,?)", (name,url,now(),now()))
        conn.execute("INSERT INTO metadata(key,value) VALUES (?,?)",("seeded","1"))
    conn.commit()
    return conn


def money(value) -> float:
    if value is None or value == "": return 0.0
    try:
        number = float(str(value).replace(",", "").replace("฿", "").strip())
        if not (0 <= number <= 100_000_000) or number != number: raise ValueError
        return round(number, 2)
    except (ValueError, OverflowError, TypeError):
        raise ValueError("ตัวเลขราคา/ค่าคอมไม่ถูกต้อง")


def validate_url(value: str) -> str:
    value = str(value or "").strip()
    if not value: return ""
    parsed = urlparse(value)
    if parsed.scheme not in ("https", "http") or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError("กรุณาใส่ลิงก์ http/https ที่ถูกต้อง")
    return value[:1200]


def save_product(conn: sqlite3.Connection, payload: dict) -> int:
    name = str(payload.get("name", "")).strip()
    if not name or len(name) > 180: raise ValueError("ต้องมีชื่อสินค้า (ไม่เกิน 180 ตัวอักษร)")
    category = str(payload.get("category") or "").strip()[:80]
    note = str(payload.get("note") or "").strip()[:1000]
    url = validate_url(payload.get("url", ""))
    price, rate = money(payload.get("price")), money(payload.get("rate"))
    if rate > 100: raise ValueError("ค่าคอมมิชชันต้องอยู่ระหว่าง 0–100%")
    verified = 1 if payload.get("verified") else 0
    image = str(payload.get("image") or "")
    if image and not re.fullmatch(r"[a-f0-9]{32}\.png", image): raise ValueError("ชื่อไฟล์ภาพไม่ถูกต้อง")
    pid = payload.get("id")
    if pid:
        pid = int(pid)
        found = conn.execute("SELECT id FROM products WHERE id=?", (pid,)).fetchone()
        if not found: raise ValueError("ไม่พบสินค้า")
        conn.execute("""UPDATE products SET name=?,category=?,price=?,rate=?,url=?,note=?,image=?,verified=?,updated_at=? WHERE id=?""",
            (name,category,price,rate,url,note,image,verified,now(),pid))
    else:
        cur = conn.execute("""INSERT INTO products (name,category,price,rate,url,note,image,verified,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)""",(name,category,price,rate,url,note,image,verified,now(),now()))
        pid = cur.lastrowid
    conn.commit()
    return int(pid)


def get_products(conn):
    result=[]
    for row in conn.execute("SELECT * FROM products ORDER BY updated_at DESC,id DESC"):
        d=dict(row)
        d["expected"] = round(d["price"] * d["rate"] / 100, 2)
        result.append(d)
    return result


def snapshot(conn):
    products=get_products(conn)
    earning = conn.execute("SELECT COUNT(*), COALESCE(SUM(amount),0) FROM earnings").fetchone()
    return {"products":products,"draft_count":conn.execute("SELECT COUNT(*) FROM drafts").fetchone()[0],
        "earnings_count":earning[0],"earned_imported":round(earning[1],2),
        "estimated_per_sale":round(sum(x["expected"] for x in products),2),
        "home":str(app_home()), "now":now()}


def clean_text(text: str) -> str:
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", str(text))


def offline_content(product: dict) -> dict:
    name=clean_text(product["name"])
    url=product.get("url") or "[ใส่ลิงก์ Affiliate ของคุณ]"
    price=product.get("price",0)
    category=product.get("category") or "สินค้าแนะนำ"
    note=clean_text(product.get("note") or "")
    factual = f"ราคาที่บันทึกไว้ {price:,.2f} บาท (ตรวจสอบราคาอีกครั้ง)" if price else "เช็กราคาล่าสุดในหน้าสินค้าก่อนซื้อ"
    selling_point = note if note else "ดูรายละเอียด คุณสมบัติ และรีวิวจริงก่อนตัดสินใจ"
    disclosure="ลิงก์นี้อาจเป็นลิงก์ Affiliate ซึ่งผู้แนะนำอาจได้รับค่าคอมมิชชันจากรายการที่เข้าเงื่อนไข"
    return {
        "title":f"{name} | {category}",
        "caption":f"กำลังมองหา {name} อยู่หรือเปล่า? 🛒\n\n{selling_point}\n{factual}\n\nดูรายละเอียดสินค้า: {url}\n\n{disclosure}\n#ShopeeAffiliate #CHAYLUEKLAB #รีวิวสินค้า",
        "script":f"[0–3 วิ] เปิดด้วยชื่อสินค้า: {name}\n[3–7 วิ] แสดงภาพสินค้าจริงและข้อมูลที่ยืนยันได้: {selling_point}\n[7–10 วิ] ชวนผู้ชมตรวจสอบราคาและรีวิวล่าสุด\n[10–12 วิ] แสดงลิงก์และข้อความเปิดเผย Affiliate",
        "scenes":[f"ช็อต 1: เปิดชื่อ {name} และภาพสินค้าที่ได้รับอนุญาต",f"ช็อต 2: จุดสำคัญ — {selling_point}","ช็อต 3: ข้อความชวนดูรายละเอียด ตรวจราคา และแสดง Affiliate disclosure"],
        "hashtags":"#ShopeeAffiliate #CHAYLUEKLAB #รีวิวสินค้า",
        "disclosure":disclosure,
        "engine":"offline-template",
    }


def generate_ollama(product: dict, model: str) -> dict:
    import urllib.request
    model = model.strip()
    if not re.fullmatch(r"[\w.\-:/]{1,80}", model): raise ValueError("ชื่อโมเดล AI ไม่ถูกต้อง")
    prompt = (
        "คุณเป็นผู้ช่วยเขียนคอนเทนต์ภาษาไทยที่ซื่อสัตย์ ห้ามแต่งราคา ส่วนลด สเปก รีวิว หรือยอดขายที่ไม่มีในข้อมูล "
        "เขียนโพสต์ Facebook/TikTok สั้นกระชับ พร้อมสคริปต์วิดีโอ 12 วินาที และคำเปิดเผย Affiliate ชัดเจน "
        "ตอบเป็นข้อความภาษาไทยล้วน ไม่ใช้ Markdown ยาวเกินไป\n"
        f"ข้อมูลสินค้าที่ผู้ใช้กรอก: {json.dumps(product,ensure_ascii=False)}\n"
        "ลิงก์เป็นลิงก์ที่ผู้ใช้ให้มา ต้องไม่ประดิษฐ์ใหม่"
    )
    body=json.dumps({"model":model,"prompt":prompt,"stream":False,"options":{"temperature":0.45}},ensure_ascii=False).encode()
    req=urllib.request.Request("http://127.0.0.1:11434/api/generate",data=body,headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req,timeout=100) as r:
        output=json.loads(r.read(2_000_000).decode())
    text=clean_text(output.get("response") or "").strip()
    if not text: raise RuntimeError("Ollama ตอบกลับว่างเปล่า")
    base=offline_content(product)
    base["caption"]=text + "\n\n"+base["disclosure"]+"\n"+(product.get("url") or "")
    base["engine"]="ollama:"+model
    return base


def import_csv_products(conn, raw: str):
    rows=list(csv.DictReader(io.StringIO(raw.lstrip('\ufeff'))))
    if not rows: raise ValueError("ไฟล์ CSV ไม่มีข้อมูล")
    if len(rows)>5000: raise ValueError("รองรับไม่เกิน 5,000 แถวต่อครั้ง")
    aliases = {
        "name":["name","title","product_name","ชื่อสินค้า","สินค้า"],
        "category":["category","หมวดหมู่"],
        "price":["price","ราคาสินค้า","ราคา"],
        "rate":["rate","commission_rate","commission_percent","ค่าคอม%","อัตราคอมมิชชั่น","เปอร์เซ็นต์ค่าคอม"],
        "url":["url","link","affiliate_link","ลิงก์","ลิงก์สินค้า"],
        "note":["note","description","หมายเหตุ","รายละเอียด"],
    }
    def col(row,field):
        lookup={str(k or '').strip().lower():v for k,v in row.items()}
        return next((lookup[k.lower()] for k in aliases[field] if k.lower() in lookup),"")
    if not any(k in {str(x or '').strip().lower() for x in rows[0]} for k in aliases['name']):
        raise ValueError("ไม่พบคอลัมน์ชื่อสินค้า: name หรือ ชื่อสินค้า")
    count=0;errors=[]
    for line,row in enumerate(rows,2):
        try:
            payload={field:col(row,field) for field in aliases}
            if not str(payload["name"]).strip(): continue
            save_product(conn,payload);count+=1
        except (ValueError, TypeError) as exc:
            errors.append(f"แถว {line}: {exc}")
    return {"imported":count,"errors":errors[:10]}


def import_earnings(conn, raw: str):
    rows=list(csv.DictReader(io.StringIO(raw.lstrip('\ufeff'))))
    if not rows:raise ValueError("ไฟล์รายงานว่างเปล่า")
    if len(rows)>20_000:raise ValueError("ไฟล์ใหญ่เกิน 20,000 แถว")
    aliases = {
        "amount": ["commission","commission_amount","estimated_commission","net_commission","ค่าคอมมิชชั่น","ค่าคอมมิชชัน","ยอดค่าคอมมิชชั่น","ค่าคอมฯ","รายได้"],
        "order": ["order_id","order","order_no","หมายเลขคำสั่งซื้อ","เลขคำสั่งซื้อ"],
        "date": ["date","order_date","วันที่","วันที่สั่งซื้อ"],
    }
    def value(row,field):
        lookup={str(k or '').strip().lower():v for k,v in row.items()}
        return str(next((lookup[k.lower()] for k in aliases[field] if k.lower() in lookup),"") or "").strip()
    if not any(x.lower() in {str(k or '').lower().strip() for k in rows[0]} for x in aliases['amount']):
        raise ValueError("ไม่พบคอลัมน์ค่าคอม: commission / ค่าคอมมิชชั่น (รูปแบบ CSV บางแบบต้องปรับชื่อคอลัมน์)")
    import hashlib
    count=0;errors=[]
    for idx,row in enumerate(rows,2):
        try:
            a_str=value(row,"amount").replace(",","").replace("฿","")
            if not a_str:continue
            a=float(a_str)
            if not -100_000_000<=a<=100_000_000:raise ValueError("จำนวนเงินเกินขอบเขต")
            o=value(row,"order");date=value(row,"date")
            # Same row content across repeated uploads is deduplicated (including refunds).
            signature=json.dumps(row,sort_keys=True,ensure_ascii=False)
            key=hashlib.sha256(signature.encode()).hexdigest()
            cur=conn.execute("INSERT OR IGNORE INTO earnings(source_key,order_label,event_date,amount,imported_at) VALUES (?,?,?,?,?)",
                (key,o[:120],date[:60],round(a,2),now()))
            count+=max(cur.rowcount,0)
        except (ValueError,TypeError) as exc:errors.append(f"แถว {idx}: {exc}")
    conn.commit()
    return {"imported":count,"errors":errors[:10]}


def export_products_csv(conn) -> str:
    target=io.StringIO();w=csv.writer(target)
    w.writerow(["name","category","price","rate","estimated_per_order","url","note","verified"])
    for p in get_products(conn):
        w.writerow([p["name"],p["category"],p["price"],p["rate"],p["expected"],p["url"],p["note"],p["verified"]])
    return '\ufeff'+target.getvalue()


def batch_drafts(conn,limit=5):
    limit=max(1,min(int(limit),30))
    products=sorted(get_products(conn),key=lambda x:(x["verified"],x["expected"]),reverse=True)[:limit]
    if not products:raise ValueError("ยังไม่มีสินค้า")
    lines=["CHAYLUEKLAB • ชุดร่างโพสต์ Affiliate",f"สร้างเมื่อ {now()}","กรุณาตรวจสอบสินค้า/ราคาจริง และสิทธิ์ใช้ภาพก่อนเผยแพร่", "="*55]
    for p in products:
        d=offline_content(p)
        conn.execute("INSERT INTO drafts(product_id,created_at,content,engine) VALUES (?,?,?,?)",(p["id"],now(),d["caption"],d["engine"]))
        lines.extend(["",f"สินค้า #{p['id']} — {p['name']}","-"*40,d["caption"],"",d["script"]])
    conn.commit()
    return "\n".join(lines)
