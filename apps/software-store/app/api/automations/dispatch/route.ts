import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdmin } from "@/lib/supabase/server";
export const maxDuration = 60;
export async function GET(req: Request) {
  return dispatch(req);
}
export async function POST(req: Request) {
  return dispatch(req);
}
async function dispatch(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  if (
    secret.length < 32 ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const endpoint = process.env.AUTOMATION_WEBHOOK_URL;
  const signing = process.env.AUTOMATION_WEBHOOK_SECRET;
  if (!endpoint || !signing || signing.length < 32)
    return NextResponse.json(
      { error: "automation receiver not configured; events remain queued" },
      { status: 503 },
    );
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password)
    return NextResponse.json({ error: "invalid receiver" }, { status: 503 });
  try {
    const db = createAdmin();
    const { error: summaryError } = await db.rpc("store_queue_daily_summary");
    if (summaryError) throw summaryError;
    const { data: events, error } = await db.rpc("store_claim_events", {
      p_limit: 5,
    });
    if (error) throw error;
    let delivered = 0;
    await Promise.all(
      (events ?? []).map(async (e: any) => {
        const raw = JSON.stringify({
          id: e.id,
          topic: e.topic,
          payload: e.payload,
          created_at: e.created_at,
        });
        const ts = String(Math.floor(Date.now() / 1000));
        const signature = createHmac("sha256", signing)
          .update(`${ts}.${raw}`)
          .digest("hex");
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-event-id": e.id,
              "x-event-timestamp": ts,
              "x-event-signature": `sha256=${signature}`,
            },
            body: raw,
            redirect: "error",
            signal: AbortSignal.timeout(8000),
          });
          if (response.ok) {
            const { error: saveError } = await db
              .from("store_outbox")
              .update({
                delivered_at: new Date().toISOString(),
                locked_until: null,
              })
              .eq("id", e.id);
            if (!saveError) delivered++;
          } else {
            await db
              .from("store_outbox")
              .update({
                locked_until: null,
                next_attempt_at: new Date(
                  Date.now() +
                    Math.min(3600, 2 ** Math.min(e.attempts, 10) * 60) * 1000,
                ).toISOString(),
              })
              .eq("id", e.id);
          }
        } catch {
          await db
            .from("store_outbox")
            .update({
              locked_until: null,
              next_attempt_at: new Date(Date.now() + 300000).toISOString(),
            })
            .eq("id", e.id);
        }
      }),
    );
    return NextResponse.json({ claimed: events?.length ?? 0, delivered });
  } catch {
    return NextResponse.json(
      { error: "automation service unavailable" },
      { status: 503 },
    );
  }
}
