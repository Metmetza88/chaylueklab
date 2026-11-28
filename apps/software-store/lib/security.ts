import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
export { csvCell } from "./csv";
export const uuid = z.uuid();
export function verifySignature(
  raw: string,
  timestamp: string | null,
  signature: string | null,
  secret: string,
  now = Date.now(),
): boolean {
  if (
    secret.length < 32 ||
    !timestamp ||
    !/^\d{10}$/.test(timestamp) ||
    !signature ||
    !/^sha256=[a-f0-9]{64}$/.test(signature)
  )
    return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest();
  const actual = Buffer.from(signature.slice(7), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}
export function safeNext(value: unknown) {
  if (typeof value !== "string" || value.length > 4096 ||
      !value.startsWith("/") || value.startsWith("//") ||
      /[\u0000-\u0020\u007f\\]/u.test(value)) return "/orders";
  // URL parsing strips tabs/newlines, so validate the raw input first and
  // independently verify its resolved origin before returning a relative path.
  try {
    return new URL(value, "https://store.invalid").origin === "https://store.invalid"
      ? value : "/orders";
  } catch { return "/orders"; }
}
export const paymentEvent = z
  .object({
    event_id: z.string().min(6).max(150),
    transaction_ref: z.string().min(6).max(150),
    order_id: uuid,
    amount_cents: z.number().int().positive(),
    currency: z.literal("THB"),
    mode: z.enum(["sandbox", "live"]),
    recipient_id: z.string().min(1).max(100),
    status: z.literal("succeeded"),
  })
  .strict();
