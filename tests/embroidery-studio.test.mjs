import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  bounds,
  moveObject,
  sequence,
  clientDesign,
  designSVG,
  parseRecord,
} from "../assets/embroidery/core.mjs";
const sample = JSON.parse(
  await readFile(new URL("../assets/embroidery/sample.json", import.meta.url)),
);
const clone = () => structuredClone(sample.design);

test("embroidery object offset, color order and visibility affect exported preview", () => {
  const d = clone(),
    o = d.objects[0],
    b = bounds(o);
  o.offset = [5, 2];
  assert.equal(bounds(o)[0], b[0] + 5);
  assert.equal(bounds(o)[1], b[1] + 2);
  o.color = "#ff0000";
  assert.equal(sequence(d)[0].color, "#ff0000");
  o.visible = false;
  assert.notEqual(sequence(d)[0].color, "#ff0000");
  const id = d.objects.at(-1).id;
  assert.equal(moveObject(d, id, -1), true);
  assert.equal(d.objects.at(-2).id, id);
  assert.equal(moveObject(d, d.objects[0].id, -1), false);
});
test("SVG contains real path geometry and rejects injection or non-finite coordinates", () => {
  const d = clone(),
    svg = designSVG(d);
  assert.match(svg, /<polyline/);
  assert.match(svg, /width="[\d.]+mm"/);
  assert.ok(!svg.includes("<script"));
  d.objects[0].color = '" onload="alert(1)';
  assert.throws(() => designSVG(d));
  const bad = clone();
  bad.objects[0].paths[0].points[0][0] = NaN;
  assert.throws(() => clientDesign(bad));
});
test("project import validates design, strips executable source and bounds text metadata", () => {
  const r = parseRecord(
    JSON.stringify({
      design: clone(),
      source: "javascript:alert(1)",
      customer: "x".repeat(200),
    }),
  );
  assert.equal(r.source, null);
  assert.equal(r.customer.length, 100);
  assert.throws(() => parseRecord("{broken"));
  const d = clone();
  d.objects.push(d.objects[0]);
  assert.throws(() => clientDesign(d));
});
test("bundled example has exact decoded command metrics and truthful capabilities", () => {
  assert.equal(sample.capabilities.machine_test, "not_tested");
  assert.equal(sample.capabilities.emb, "not_available");
  assert.equal(sample.metrics.stitch_count, sample.commands.filter(c => c[2] === 0).length);
  assert.equal(sample.metrics.color_changes, sample.commands.filter(c => c[2] === 5).length);
  assert.equal(sample.thread_sequence.length, sample.metrics.color_changes + 1);
  assert.equal(Buffer.from(sample.file_base64, "base64").subarray(0, 3).toString(), "LA:");
});
