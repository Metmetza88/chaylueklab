"""Local moving-image MP4 generator. Requires FFmpeg on PATH."""
import argparse, pathlib, shutil, subprocess, tempfile
p=argparse.ArgumentParser()
p.add_argument("--images",nargs="+",required=True)
p.add_argument("--name",required=True)
p.add_argument("--out",required=True)
a=p.parse_args()
if not shutil.which("ffmpeg"): raise SystemExit("Install FFmpeg")
images=[pathlib.Path(x).resolve() for x in a.images]
if not all(x.is_file() and x.suffix.lower() in (".png",".jpg",".jpeg",".webp") for x in images): raise SystemExit("Missing image")
out=pathlib.Path(a.out).resolve()
out.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    clips=[]
    for i,img in enumerate(images):
        dest=pathlib.Path(tmp)/f"{i:03d}.mp4"
        vf="scale=1200:2100:force_original_aspect_ratio=increase,crop=1200:2100,zoompan=z='min(zoom+0.0006,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=125:s=720x1280:fps=25,format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st=4.7:d=0.3"
        subprocess.run(["ffmpeg","-y","-loglevel","error","-loop","1","-i",str(img),"-vf",vf,"-frames:v","125","-an","-c:v","libx264","-preset","veryfast",str(dest)],check=True)
        clips.append(dest)
    manifest=pathlib.Path(tmp)/"list.txt"
    manifest.write_text("".join(f"file '{x}'\n" for x in clips))
    subprocess.run(["ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",str(manifest),"-f","lavfi","-i","anullsrc=r=44100:cl=stereo","-t",str(len(clips)*5),"-c:v","copy","-c:a","aac","-shortest",str(out)],check=True)
print(f"Created {out}. Review before publishing; no automatic Shopee upload.")