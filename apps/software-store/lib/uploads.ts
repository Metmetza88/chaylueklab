import "server-only";
import sharp from "sharp";
import { createHash } from "node:crypto";
export async function cleanImage(file: File, max = 5 * 1024 * 1024) {
  if (
    file.size < 8 ||
    file.size > max ||
    !["image/png", "image/jpeg"].includes(file.type)
  )
    throw new Error("INVALID_IMAGE");
  const raw = Buffer.from(await file.arrayBuffer());
  const png = raw
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = raw[0] === 255 && raw[1] === 216 && raw[2] === 255;
  if (!png && !jpg) throw new Error("INVALID_IMAGE");
  const output = await sharp(raw, {
    limitInputPixels: 20000000,
    failOn: "warning",
  })
    .rotate()
    .resize({
      width: 2200,
      height: 2200,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  if (output.length > max) throw new Error("IMAGE_TOO_LARGE");
  return {
    data: output,
    hash: createHash("sha256").update(raw).digest("hex"),
    canonicalHash: createHash("sha256").update(output).digest("hex"),
  };
}
