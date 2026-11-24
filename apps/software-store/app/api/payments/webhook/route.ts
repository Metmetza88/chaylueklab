import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { createAdmin } from "@/lib/supabase/server";
import { verifySignature, paymentEvent } from "@/lib/security";
import { paymentMode } from "@/lib/env";
import { boundedText } from "@/lib/http";
export async function POST(req: NextRequest) {
  const mode = paymentMode();
  if (mode === "disabled" || process.env.PAYMENT_WEBHOOK_ENABLED !== "true")
    return NextResponse.json({ error: "disabled" }, { status: 503 });
  try {
    const raw = await boundedText(req);
    if (
      !verifySignature(
        raw,
        req.headers.get("x-payment-timestamp"),
        req.headers.get("x-payment-signature"),
        process.env.PAYMENT_WEBHOOK_SECRET ?? "",
      )
    )
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    const body = paymentEvent.safeParse(JSON.parse(raw));
    if (!body.success)
      return NextResponse.json({ error: "invalid event" }, { status: 400 });
    const b = body.data;
    if (
      !process.env.PAYMENT_RECIPIENT_ID ||
      b.recipient_id !== process.env.PAYMENT_RECIPIENT_ID ||
      b.mode !== mode
    )
      return NextResponse.json(
        { error: "recipient or mode mismatch" },
        { status: 422 },
      );
    const { data, error } = await createAdmin().rpc("store_confirm_payment", {
      p_order: b.order_id,
      p_event: b.event_id,
      p_ref: b.transaction_ref,
      p_hash: createHash("sha256").update(raw).digest("hex"),
      p_amount: b.amount_cents,
      p_mode: b.mode,
    });
    if (error)
      return NextResponse.json(
        {
          error:
            "payment rejected: amount, reference, order state or replay conflict",
        },
        { status: 409 },
      );
    return NextResponse.json({ ok: true, payment_id: data });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === "TOO_LARGE"
            ? "payload too large"
            : "invalid payload or unavailable service",
      },
      { status: e instanceof Error && e.message === "TOO_LARGE" ? 413 : 400 },
    );
  }
}
