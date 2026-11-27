import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/security";

const origin = "https://store.chaylueklab.com";

describe("post-authentication redirect origin boundary", () => {
  it.each([
    "/\n/evil.example",
    "/\r/evil.example",
    "/\t/evil.example",
    "/\r\n/evil.example",
    "/orders\n",
    "/orders?tab=\tpaid",
    "/\u0000/evil.example",
    "/orders\u007f",
  ])("rejects control-character normalization in %j", (value) => {
    expect(safeNext(value)).toBe("/orders");
    expect(new URL(safeNext(value), origin).origin).toBe(origin);
  });

  it.each([
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "https://evil.example",
    "http://evil.example",
    "javascript:alert(1)",
    "data:text/html,example",
    "",
    null,
    undefined,
    123,
    {},
  ])("rejects non-local redirect value %j", (value) => {
    expect(safeNext(value)).toBe("/orders");
  });

  it.each([
    "/orders",
    "/products?category=school",
    "/orders?tab=paid#recent",
    "/schools/demo-school/applications",
    "/reset-password?next=%2Forders",
    "/support?message=see%20https%3A%2F%2Fexample.com",
  ])("preserves an ordinary local path and query %j", (value) => {
    expect(safeNext(value)).toBe(value);
    expect(new URL(safeNext(value), origin).origin).toBe(origin);
  });
});
