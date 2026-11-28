import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { createAdmin } from "@/lib/supabase/server";
import { verifySignature, paymentEvent } from "@/lib/security";
import { paymentMode } from "@/lib/env";
import { boundedText } from "@/lib/http";
export async function POST(req: NextRequest) {
  const mode = paymentMode();
  const secret = process.env.PAYMENT_WEBHOOK_SECRET ?? "";
  if (
    mode === "disabled" ||
    process.env.PAYMENT_WEBHOOK_ENABLED !== "true" ||
    secret.length < 32 ||
    !process.env.PAYMENT_RECIPIENT_ID
  )
    return NextResponse.json(
      { error: "disabled or unconfigured" },
      { status: 503 },
    );
  let raw: string;
  try {
    raw = await boundedText(req);
  } catch {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  if (
    !verifySignature(
      raw,
      req.headers.get("x-payment-timestamp"),
      req.headers.get("x-payment-signature"),
      secret,
    )
  )
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const body = paymentEvent.safeParse(parsed);
  if (!body.success)
    return NextResponse.json({ error: "invalid event" }, { status: 400 });
  const b = body.data;
  if (b.recipient_id !== process.env.PAYMENT_RECIPIENT_ID || b.mode !== mode)
    return NextResponse.json(
      { error: "recipient or mode mismatch" },
      { status: 422 },
    );
  try {
    const { data, error } = await createAdmin().rpc("store_confirm_payment", {
      p_order: b.order_id,
      p_event: b.event_id,
      p_ref: b.transaction_ref,
      p_hash: createHash("sha256").update(raw).digest("hex"),
      p_amount: b.amount_cents,
      p_mode: b.mode,
    });
    if (error) {
      const rejected = ["P0001", "23505", "23514", "22P02"].includes(
        error.code,
      );
      return NextResponse.json(
        {
          error: rejected
            ? "payment rejected: amount, reference, order state or replay conflict"
            : "payment service temporarily unavailable",
        },
        { status: rejected ? 409 : 503 },
      );
    }
    return NextResponse.json({ ok: true, payment_id: data });
  } catch {
    return NextResponse.json(
      { error: "payment service temporarily unavailable" },
      { status: 503 },
    );
  }
}
