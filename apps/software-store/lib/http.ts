export async function boundedText(req: Request, max = 16384) {
  if (Number(req.headers.get("content-length") ?? 0) > max)
    throw new Error("TOO_LARGE");
  const reader = req.body?.getReader();
  if (!reader) return "";
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > max) {
      await reader.cancel();
      throw new Error("TOO_LARGE");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
