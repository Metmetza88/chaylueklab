import { describe, expect, it } from "vitest";
import { schoolQuotePrice, summarizeSchoolQuote } from "../lib/quote";

describe("school quote prices", () => {
  it("uses supplied service prices, not a default for unknown products", () => {
    expect(schoolQuotePrice("met-sport")).toBe("฿3,900–฿6,500 / งาน");
    expect(schoolQuotePrice("met-attendance")).toBe("฿4,900–฿9,900 / ปี");
    expect(schoolQuotePrice("met-vote")).toBe("฿2,900–฿4,500 / ครั้ง");
    for (const slug of ["met-admission", "met-school-pro", "constructor"]) {
      expect(schoolQuotePrice(slug)).toBe("ขอใบเสนอราคาตามขอบเขตงาน");
    }
  });

  it("groups only known prices by period; unknown prices are not zero", () => {
    expect(
      summarizeSchoolQuote([
        "met-attendance",
        "met-sport",
        "met-sport",
        "met-vote",
        "met-admission",
      ]),
    ).toEqual({
      groups: [
        { unit: "งาน", label: "฿3,900–฿6,500 / งาน" },
        { unit: "ปี", label: "฿4,900–฿9,900 / ปี" },
        { unit: "ครั้ง", label: "฿2,900–฿4,500 / ครั้ง" },
      ],
      unpriced: 1,
    });
    expect(summarizeSchoolQuote(["met-school-pro", "met-admission"])).toEqual({
      groups: [],
      unpriced: 2,
    });
    expect(summarizeSchoolQuote([])).toEqual({ groups: [], unpriced: 0 });
  });
});
