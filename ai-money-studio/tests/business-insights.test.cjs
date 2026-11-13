// Run: node --test ai-money-studio/tests/business-insights.test.cjs
// No dependencies, internet or AI API credentials required.
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "business-insights.html"), "utf8");
const scripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, "Expected one inline demo script");

function element() {
  return {
    value: "", textContent: "", hidden: false, style: {}, className: "",
    children: [], handlers: {}, files: [],
    addEventListener(event, handler) { this.handlers[event] = handler; },
    replaceChildren(...items) { this.children = items; },
    append(...items) { this.children.push(...items); },
    click() { return this.handlers.click?.(); }
  };
}
function app() {
  const items = new Map();
  const document = {
    getElementById(id) {
      if (!items.has(id)) items.set(id, element());
      return items.get(id);
    },
    createElement() { return element(); }
  };
  const context = {
    document,
    navigator: { clipboard: { writeText: async () => {} } },
    URL: { createObjectURL: () => "", revokeObjectURL: () => {} },
    Blob, setTimeout: () => {}
  };
  vm.runInNewContext(scripts[0][1], context, { timeout: 1500 });
  return id => document.getElementById(id);
}
test("sample data: 7 rows, 12 units, 3 products, THB 7200", () => {
  const $ = app();
  $("sample").click();
  $("analyze").click();
  assert.equal($("revenue").textContent, "฿7,200");
  assert.equal($("units").textContent, "12");
  assert.equal($("rows").textContent, "7");
  assert.equal($("products").textContent, "3");
  assert.equal($("ranking").children.length, 3);
  assert.equal($("results").hidden, false);
});
test("blank prices must fail, not silently become zero", () => {
  const $ = app();
  $("csv").value = "product,quantity,unit_price\nSample,2,";
  $("analyze").click();
  assert.match($("status").textContent, /แถวที่ 2/);
  assert.equal($("results").hidden, true);
});
test("negative quantities must fail", () => {
  const $ = app();
  $("csv").value = "product,quantity,unit_price\nSample,-2,100";
  $("analyze").click();
  assert.match($("status").textContent, /แถวที่ 2/);
});
test("quoted commas inside a product name must work", () => {
  const $ = app();
  $("csv").value = 'product,quantity,unit_price\n"Blue, White",2,100';
  $("analyze").click();
  assert.equal($("revenue").textContent, "฿200");
});
test("invalid CSV hides previous results", () => {
  const $ = app();
  $("sample").click();
  $("analyze").click();
  $("csv").value = "invalid";
  $("analyze").click();
  assert.equal($("results").hidden, true);
  assert.equal($("marketing").hidden, true);
});
test("clear resets the form and result panels", () => {
  const $ = app();
  $("sample").click();
  $("analyze").click();
  $("clear").click();
  assert.equal($("csv").value, "");
  assert.equal($("results").hidden, true);
});
test("data is displayed using text, not HTML injection", () => {
  assert.doesNotMatch(scripts[0][1], /\.innerHTML\s*=/);
});
