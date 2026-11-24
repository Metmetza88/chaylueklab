import "server-only";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function makePdf(title: string, lines: string[]) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    await readFile(path.join(process.cwd(), "public/fonts/NotoSansThai.ttf")),
    { subset: true },
  );
  const latin = await doc.embedFont(
    await readFile(path.join(process.cwd(), "public/fonts/NotoSans.ttf")),
    { subset: true },
  );
  let page = doc.addPage([595, 842]);
  let y = 785;
  function draw(text: string, size: number) {
    let x = 42;
    let pending = "";
    let last = font;
    const flush = () => {
      if (pending) {
        page.drawText(pending, {
          x,
          y,
          size,
          font: last,
          color: rgb(0.1, 0.14, 0.22),
        });
        x += last.widthOfTextAtSize(pending, size);
        pending = "";
      }
    };
    for (const c of text) {
      const f = /[\u0E00-\u0E7F]/.test(c) ? font : latin;
      if (f !== last) {
        flush();
        last = f;
      }
      if (x + last.widthOfTextAtSize(pending + c, size) > 550) {
        flush();
        x = 42;
        y -= 25;
      }
      pending += c;
    }
    flush();
    y -= size + 15;
    if (y < 65) {
      page = doc.addPage([595, 842]);
      y = 785;
    }
  }
  draw(title, 19);
  draw("WORAMET AI LAB", 10);
  for (const line of lines) {
    for (const part of line.split("\n")) draw(part, 11);
  }
  doc.setTitle(title);
  return Buffer.from(await doc.save());
}
