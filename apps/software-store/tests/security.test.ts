import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifySignature,
  csvCell,
  safeNext,
  paymentEvent,
} from "@/lib/security";
import { promptPayPayload, crc16 } from "@/lib/promptpay";
import { cleanImage } from "@/lib/uploads";
import sharp from "sharp";
import { makePdf } from "@/lib/pdf";
import { PDFDocument } from "pdf-lib";
const secret = "s".repeat(40);
const ts = "1795480000";
const now = Number(ts) * 1000;
const raw = '{"event_id":"event-01"}';
const signature =
  "sha256=" + createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex");
describe("payment signatures", () => {
  it("verifies signed raw bytes", () =>
    expect(verifySignature(raw, ts, signature, secret, now)).toBe(true));
  it.each([
    [raw + "x", ts, signature],
    [raw, String(Number(ts) - 301), signature],
    [raw, ts, "sha256=ก".repeat(64)],
    [raw, "NaN", signature],
    [raw, ts, null],
  ])("rejects forged, stale and malformed signatures", (body, t, s) =>
    expect(verifySignature(body!, t, s, secret, now)).toBe(false),
  );
  it("does not accept price strings or extra fields", () =>
    expect(
      paymentEvent.safeParse({ amount_cents: "100", status: "succeeded" })
        .success,
    ).toBe(false));
});
describe("PromptPay", () => {
  it("matches CRC standard vector", () =>
    expect(crc16("123456789")).toBe("29B1"));
  it("includes fixed amount and valid checksum", () => {
    const p = promptPayPayload("0812345678", 3500);
    expect(p).toContain("54073500.00");
    expect(p).toContain("0066812345678");
    expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)));
  });
  it.each([-1, 0, NaN, Infinity, 1.123])("rejects invalid amounts %s", (n) =>
    expect(() => promptPayPayload("0812345678", n)).toThrow(),
  );
  it("rejects malformed recipients", () =>
    expect(() => promptPayPayload("https://test")).toThrow());
});
describe("data boundaries", () => {
  it.each(['=HYPERLINK("evil")', "+1", "-1", "@SUM(A1)", " \t=1"])(
    "neutralizes CSV formulas",
    (v) => expect(csvCell(v).startsWith("\"'")).toBe(true),
  );
  it("quotes CSV correctly", () =>
    expect(csvCell('abc,"x"')).toBe('"abc,""x"""'));
  it.each(["//evil.test", "/\\evil.test", "https://evil.test"])(
    "rejects unsafe redirect %s",
    (v) => expect(safeNext(v)).toBe("/orders"),
  );
});
describe("uploaded files", () => {
  it("rejects HTML disguised as image", async () => {
    await expect(
      cleanImage(
        new File(["<script>alert(1)</script>"], "fake.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toThrow();
  });
  it("canonicalizes images and hashes consistently", async () => {
    const bytes = await sharp({
      create: { width: 50, height: 50, channels: 3, background: "#ff0000" },
    })
      .png()
      .toBuffer();
    const a = await cleanImage(
      new File([new Uint8Array(bytes)], "safe.png", { type: "image/png" }),
    );
    const b = await cleanImage(
      new File([new Uint8Array(bytes)], "renamed.png", { type: "image/png" }),
    );
    expect(a.canonicalHash).toBe(b.canonicalHash);
    expect((await sharp(a.data).metadata()).format).toBe("png");
  });
});
it("generates a valid Thai application PDF", async () => {
  const bytes = await makePdf("ใบสมัครทดสอบ", [
    "นักเรียนสมมติ เมตศึกษา",
    "MET Admission 2570",
  ]);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
});
