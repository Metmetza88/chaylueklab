"""Single-computer Windows app with localhost browser UI and SQLite storage."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import mimetypes
import os
import secrets
import sys
import threading
import traceback
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import core


def resource_file(name):
    root=Path(getattr(sys,"_MEIPASS",Path(__file__).resolve().parent))
    return root/name


class LocalServer(ThreadingHTTPServer):
    daemon_threads=True
    allow_reuse_address=True
    def __init__(self,addr,handler,home):
        super().__init__(addr,handler)
        self.home=home
        self.conn=core.db_connect(home)
        self.lock=threading.RLock()
        self.token=secrets.token_urlsafe(32)


class Handler(BaseHTTPRequestHandler):
    server_version="CHAYLUEKLAB-Local/1.0"

    def log_message(self,format,*args):
        # No query parameters or secrets logged.
        print("[Local Studio]",format%args)

    def headers_base(self,length,content_type="application/json; charset=utf-8",extra=None):
        self.send_response(200)
        self.send_header("Content-Type",content_type)
        self.send_header("Content-Length",str(length))
        self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("Referrer-Policy","no-referrer")
        self.send_header("X-Frame-Options","DENY")
        if extra:
            for name,val in extra.items():self.send_header(name,val)
        self.end_headers()

    def response(self,code, data):
        raw=json.dumps(data,ensure_ascii=False,default=str).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Content-Length",str(len(raw)))
        self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.end_headers()
        self.wfile.write(raw)

    def send_bytes(self,blob,content_type,filename=None):
        extra={}
        if filename:
            extra["Content-Disposition"]='attachment; filename="'+filename.replace('"','')+'"'
        self.headers_base(len(blob),content_type,extra)
        self.wfile.write(blob)

    def token_valid(self):
        key=self.headers.get("X-Local-App-Key","")
        if not secrets.compare_digest(key,self.server.token):return False
        origin=self.headers.get("Origin")
        if origin:
            url=urlparse(origin)
            if url.hostname not in ("127.0.0.1","localhost") or url.port!=self.server.server_port:
                return False
        return True

    def do_GET(self):
        path=urlparse(self.path).path
        params=parse_qs(urlparse(self.path).query)
        try:
            if path=="/" or path=="/index.html":
                data=resource_file("web/index.html").read_text(encoding="utf-8").replace("__LOCAL_APP_TOKEN__",self.server.token)
                self.send_bytes(data.encode("utf-8"),"text/html; charset=utf-8")
            elif path=="/api/state":
                with self.server.lock:result=core.snapshot(self.server.conn)
                result["home"]=str(self.server.home)
                self.response(200,result)
            elif path=="/api/drafts":
                with self.server.lock:
                    rows=self.server.conn.execute("SELECT d.id,d.product_id,d.created_at,d.engine,d.content,p.name FROM drafts d LEFT JOIN products p ON d.product_id=p.id ORDER BY d.id DESC LIMIT 30").fetchall()
                self.response(200,{"drafts":[dict(row) for row in rows]})
            elif path=="/api/export-products":
                with self.server.lock:content=core.export_products_csv(self.server.conn)
                self.send_bytes(content.encode("utf-8"),"text/csv; charset=utf-8","CHAYLUEKLAB_products.csv")
            elif path=="/api/download":
                name=params.get("name",[""])[0]
                if not name or name!=Path(name).name or not name.endswith((".txt",".mp4",".csv")):
                    raise ValueError("ชื่อไฟล์ไม่ถูกต้อง")
                file=self.server.home/"outputs"/name
                if not file.is_file():raise FileNotFoundError("ไม่พบไฟล์")
                mime="video/mp4" if name.endswith(".mp4") else "text/plain; charset=utf-8"
                self.send_bytes(file.read_bytes(),mime,name)
            elif path.startswith("/images/"):
                name=path.removeprefix("/images/")
                import re
                if not re.fullmatch(r"[a-f0-9]{32}\.png",name):raise ValueError("ชื่อรูปไม่ถูกต้อง")
                file=self.server.home/"images"/name
                self.send_bytes(file.read_bytes(),"image/png")
            elif path=="/api/health":
                self.response(200,{"ok":True,"mode":"localhost","version":"1.0.0"})
            else:
                self.response(404,{"error":"ไม่พบหน้า"})
        except (ValueError,FileNotFoundError) as e:self.response(400,{"error":str(e)})
        except Exception as e:
            traceback.print_exc();self.response(500,{"error":f"เกิดข้อผิดพลาด: {e}"})

    def do_POST(self):
        if not self.token_valid():return self.response(403,{"error":"คำขอไม่ได้รับอนุญาต"})
        size=int(self.headers.get("Content-Length","0"))
        if size<1 or size>12_000_000:return self.response(413,{"error":"ข้อมูลเกิน 12 MB หรือว่างเปล่า"})
        path=urlparse(self.path).path
        try:
            raw=self.rfile.read(size)
            if path=="/api/upload-image":
                from PIL import Image, ImageOps
                Image.MAX_IMAGE_PIXELS=30_000_000
                img=Image.open(io.BytesIO(raw));img.verify()
                img=Image.open(io.BytesIO(raw)).convert("RGB")
                img.thumbnail((1600,1600),Image.Resampling.LANCZOS)
                name=uuid.uuid4().hex+".png"
                img.save(self.server.home/"images"/name,optimize=True)
                return self.response(200,{"image":name})
            payload=json.loads(raw.decode("utf-8"))
            if path=="/api/save-product":
                with self.server.lock:pid=core.save_product(self.server.conn,payload)
                return self.response(200,{"ok":True,"id":pid})
            if path=="/api/delete-product":
                pid=int(payload.get("id"))
                with self.server.lock:
                    self.server.conn.execute("DELETE FROM products WHERE id=?",(pid,))
                    self.server.conn.commit()
                return self.response(200,{"ok":True})
            if path=="/api/import-products":
                with self.server.lock:result=core.import_csv_products(self.server.conn,str(payload["csv"]))
                return self.response(200,result)
            if path=="/api/import-earnings":
                with self.server.lock:result=core.import_earnings(self.server.conn,str(payload["csv"]))
                return self.response(200,result)
            if path=="/api/generate":
                with self.server.lock:
                    found=self.server.conn.execute("SELECT * FROM products WHERE id=?",(int(payload.get("id")),)).fetchone()
                if not found:raise ValueError("ไม่พบสินค้า")
                product=dict(found)
                engine=str(payload.get("engine","offline"))
                if engine=="ollama":result=core.generate_ollama(product,str(payload.get("model") or "llama3.2"))
                else:result=core.offline_content(product)
                with self.server.lock:
                    self.server.conn.execute("INSERT INTO drafts(product_id,created_at,content,engine) VALUES (?,?,?,?)",
                        (product["id"],core.now(),result["caption"],result["engine"]))
                    self.server.conn.commit()
                return self.response(200,result)
            if path=="/api/batch":
                with self.server.lock:content=core.batch_drafts(self.server.conn,payload.get("limit",5))
                name="Batch_posts_"+uuid.uuid4().hex[:10]+".txt"
                (self.server.home/"outputs"/name).write_text(content,encoding="utf-8-sig")
                return self.response(200,{"ok":True,"name":name})
            if path=="/api/video":
                with self.server.lock:
                    found=self.server.conn.execute("SELECT * FROM products WHERE id=?",(int(payload.get("id")),)).fetchone()
                if not found:raise ValueError("ไม่พบสินค้า")
                from video import make_video
                file=make_video(self.server.home,dict(found),payload.get("seconds",12))
                return self.response(200,{"ok":True,"name":file.name,"size_mb":round(file.stat().st_size/1_000_000,2)})
            self.response(404,{"error":"ไม่พบคำสั่ง"})
        except (KeyError,ValueError,TypeError,json.JSONDecodeError) as e:self.response(400,{"error":str(e)})
        except Exception as e:
            traceback.print_exc()
            self.response(500,{"error":str(e)})


def main():
    parser=argparse.ArgumentParser(description="CHAYLUEKLAB Shopee Affiliate Studio (local only)")
    parser.add_argument("--port",type=int,default=0)
    parser.add_argument("--no-browser",action="store_true")
    args=parser.parse_args()
    home=core.app_home()
    server=LocalServer(("127.0.0.1",args.port),Handler,home)
    url=f"http://127.0.0.1:{server.server_port}"
    print("CHAYLUEKLAB Affiliate AI Studio is ready:",url,flush=True)
    print("Local data:",home,flush=True)
    if not args.no_browser:
        threading.Timer(0.8,lambda:webbrowser.open(url)).start()
    try:server.serve_forever(poll_interval=0.3)
    except KeyboardInterrupt:pass
    finally:server.server_close();server.conn.close()


if __name__=="__main__":main()
