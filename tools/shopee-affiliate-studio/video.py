"""Local 9:16 MP4 renderer. Requires Pillow + imageio-ffmpeg; no cloud API."""
from __future__ import annotations
import math
import os
import re
import subprocess
import sys
import uuid
from pathlib import Path


def _font(size, bold=False):
    from PIL import ImageFont
    windir=Path(os.environ.get("WINDIR","C:/Windows")) / "Fonts"
    names=["LeelawUIB.ttf","tahomabd.ttf","LeelawUI.ttf","tahoma.ttf"] if bold else ["LeelawUI.ttf","tahoma.ttf","LeelawUIB.ttf"]
    roots=[windir,Path("/usr/share/fonts/truetype/noto"),Path("/usr/share/fonts/opentype/noto"),Path("/usr/share/fonts/truetype/dejavu")]
    for root in roots:
        choices=names+["NotoSansThai-Regular.ttf","NotoSansThai-Bold.ttf","DejaVuSans.ttf"]
        for name in choices:
            path=root/name
            if path.is_file():return ImageFont.truetype(str(path),size=size)
    return ImageFont.load_default(size=size)


def _lines(draw,text,font,max_width,max_lines=5):
    lines=[]
    for raw in str(text).splitlines():
        if not raw.strip():continue
        words=raw.split(' ')
        if len(words)==1:
            # Thai text often has no spaces; split by actual glyph fit.
            unit=raw
            while unit:
                end=len(unit)
                while end>1 and draw.textbbox((0,0),unit[:end],font=font)[2]>max_width:end-=1
                lines.append(unit[:end]);unit=unit[end:]
        else:
            acc=""
            for word in words:
                trial=(acc+' '+word).strip()
                if draw.textbbox((0,0),trial,font=font)[2]<=max_width:acc=trial
                else:
                    if acc:lines.append(acc)
                    acc=word
            if acc:lines.append(acc)
    return lines[:max_lines]


def _render_card(path,title,subtitle,product_image,scene_num):
    from PIL import Image, ImageDraw, ImageOps
    w,h=720,1280
    img=Image.new("RGB",(w,h),"#09131e")
    pix=img.load()
    for y in range(h):
        for x in range(w):
            glow=max(0,1-((x-(w*.78))**2/(w*w*.72)+(y-(h*.22))**2/(h*h*.45)) )
            r=int(8+glow*16+y/h*8)
            g=int(16+glow*24+y/h*8)
            b=int(27+glow*30+y/h*11)
            pix[x,y]=(r,g,b)
    draw=ImageDraw.Draw(img)
    gold="#e5c37d";white="#f5f5f5";muted="#b6c1d0"
    draw.rounded_rectangle((35,40,685,1234),radius=30,outline="#385064",width=3)
    draw.text((64,68),"CHAYLUEKLAB / AFFILIATE",font=_font(28,True),fill=gold)
    draw.text((64,125),f"SCENE 0{scene_num}   •   SHORT VIDEO",font=_font(20),fill=muted)
    visual_box=(72,206,648,778)
    draw.rounded_rectangle(visual_box,radius=28,fill="#19293a",outline="#58687a",width=2)
    if product_image:
        try:
            src=Image.open(product_image).convert("RGB")
            src.thumbnail((544,540),Image.Resampling.LANCZOS)
            cx=360-src.width//2;cy=492-src.height//2
            img.paste(src,(cx,cy))
        except Exception:
            pass
    else:
        draw.text((225,480),"PRODUCT IMAGE",font=_font(24),fill="#83909e")
        draw.text((201,530),"เพิ่มภาพสินค้าในโปรแกรม",font=_font(24),fill=muted)
    title_font=_font(45,True)
    y=825
    for line in _lines(draw,title,title_font,570,3):
        draw.text((73,y),line,font=title_font,fill=white);y+=65
    detail_font=_font(28)
    for line in _lines(draw,subtitle,detail_font,575,3):
        draw.text((75,y+12),line,font=detail_font,fill=muted);y+=43
    draw.line((75,1130,645,1130),fill=gold,width=2)
    draw.text((75,1151),"ลิงก์ Affiliate • ตรวจสอบราคาล่าสุด",font=_font(22),fill=gold)
    img.save(path,optimize=True)


def make_video(home, product, seconds=12):
    from PIL import Image  # noqa: F401
    import imageio_ffmpeg
    seconds=int(seconds)
    if seconds not in (9,12,15):raise ValueError("ความยาววิดีโอต้องเป็น 9, 12 หรือ 15 วินาที")
    out_dir=Path(home)/"outputs";out_dir.mkdir(parents=True,exist_ok=True)
    media_dir=out_dir/("frames_"+uuid.uuid4().hex[:12]);media_dir.mkdir()
    raw_image=product.get("image") or ""
    image_path=Path(home)/"images"/raw_image if re.fullmatch(r"[a-f0-9]{32}\.png",raw_image) else None
    if image_path and not image_path.is_file():image_path=None
    name=product["name"]
    note=product.get("note") or "ดูข้อมูลและรีวิวจริงก่อนซื้อ"
    price=product.get("price") or 0
    p_label = f"ราคาในรายการ {price:,.0f} บาท (อาจเปลี่ยนแปลง)" if price else "เช็กราคาล่าสุดที่หน้าสินค้า"
    captions=[(name,"สินค้าแนะนำ • CHAYLUEKLAB"),("จุดน่าสนใจ",note),("ดูรายละเอียด",p_label)]
    files=[]
    for i,(title,subtitle) in enumerate(captions,1):
        file=media_dir/f"slide_{i}.png"
        _render_card(file,title,subtitle,image_path,i)
        files.append(file)
    per=seconds//3
    output=out_dir/f"CHAYLUEKLAB_{product['id']}_{uuid.uuid4().hex[:8]}.mp4"
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    cmd=[ffmpeg,"-hide_banner","-loglevel","error","-y"]
    for p in files:cmd +=["-loop","1","-framerate","25","-t",str(per),"-i",str(p)]
    cmd +=["-filter_complex","[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]","-map","[v]", "-r","25","-c:v","libx264","-preset","veryfast","-crf","26","-pix_fmt","yuv420p","-movflags","+faststart",str(output)]
    try:
        result=subprocess.run(cmd,capture_output=True,text=True,timeout=180,check=False,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
        if result.returncode!=0:
            raise RuntimeError("FFmpeg ไม่สามารถสร้างวิดีโอได้: "+result.stderr[-600:])
        return output
    finally:
        for p in files:p.unlink(missing_ok=True)
        media_dir.rmdir()
