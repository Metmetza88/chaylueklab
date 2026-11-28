import manifest from "@/package.json";
import { NextResponse } from "next/server";
import { configured, paymentMode } from "@/lib/env";
export function GET() {
  return NextResponse.json(
    {
      service: "chaylueklab-software-store",
      version: manifest.version,
      database_configured: configured(),
      payment_mode: paymentMode(),
      ready_for_live_payments: false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
