import { test } from "node:test";
import assert from "node:assert/strict";
import { route, validate, overlaps, waves, plan, MAX_PARALLEL } from "./waves.mjs";

const t = (id, extra = {}) => ({ id, title: id, size: "M", kind: "code", done: "npm test", files: [`src/${id}.ts`], ...extra });
const ids = (w) => w.map((wave) => wave.map((x) => x.id));

test("routes by kind and size", () => {
  assert.deepEqual(route(t("a", { size: "S" })), { where: "agent", agent: "delegate-worker", model: "haiku" });
  assert.equal(route(t("a")).model, "sonnet");
  assert.equal(route(t("a", { kind: "research", size: "S" })).agent, "Explore");
  assert.equal(route(t("a", { kind: "design" })).where, "inline");
  assert.equal(route(t("a", { kind: "mechanical", size: "L" })).model, "sonnet");
});

test("opus only for hard L code on GREEN", () => {
  assert.equal(route(t("a", { size: "L", hard: true }), "GREEN").model, "opus");
  assert.equal(route(t("a", { size: "L", hard: true }), "AMBER").model, "sonnet");
});

test("validate rejects missing done checks, bad sizes, unknown deps, duplicates", () => {
  const errs = validate([t("a", { done: "" }), t("b", { size: "XL" }), t("c", { deps: ["zz"] }), t("c")]);
  assert.ok(errs.some((e) => /a: no done/.test(e)));
  assert.ok(errs.some((e) => /b: size/.test(e)));
  assert.ok(errs.some((e) => /unknown zz/.test(e)));
  assert.ok(errs.some((e) => /duplicate/.test(e)));
});

test("overlaps catches same file and folder containment, case and slash insensitive", () => {
  assert.equal(overlaps(["src/a.ts"], ["SRC\\a.ts"]), true);
  assert.equal(overlaps(["src"], ["src/x/y.ts"]), true);
  assert.equal(overlaps(["src/a.ts"], ["src/ab.ts"]), false);
});

test("independent tasks share a wave; deps wait", () => {
  const w = waves([t("a"), t("b"), t("c", { deps: ["a"] })]);
  assert.deepEqual(ids(w), [["a", "b"], ["c"]]);
});

test("writers on the same file never share a wave", () => {
  const w = waves([t("a", { files: ["src/x.ts"] }), t("b", { files: ["src/x.ts"] })]);
  assert.deepEqual(ids(w), [["a"], ["b"]]);
});

test("readers can run beside each other on the same files", () => {
  const r = (id) => t(id, { kind: "research", files: ["src"] });
  assert.deepEqual(ids(waves([r("a"), r("b")])), [["a", "b"]]);
});

test("a writer with unknown files runs alone", () => {
  const w = waves([t("a"), t("b", { files: [] }), t("c")]);
  assert.ok(w.every((wave) => !wave.some((x) => x.id === "b") || wave.length === 1));
  assert.equal(w.flat().length, 3);
});

test("waves cap at MAX_PARALLEL", () => {
  const many = Array.from({ length: MAX_PARALLEL + 2 }, (_, i) => t(`t${i}`));
  assert.equal(waves(many)[0].length, MAX_PARALLEL);
});

test("cycles are reported, not looped forever", () => {
  assert.throws(() => waves([t("a", { deps: ["b"] }), t("b", { deps: ["a"] })]), /cycle/);
});

test("plan: inline design first, its dependents still dispatch; RED refuses", () => {
  const p = plan({ tasks: [t("d", { kind: "design" }), t("a", { deps: ["d"] })] });
  assert.deepEqual(p.inline.map((x) => x.id), ["d"]);
  assert.deepEqual(ids(p.waves), [["a"]]);
  assert.match(plan({ tasks: [t("a")] }, "RED").errors[0], /RED/);
});

test("plan points a single task at the quick lane", () => {
  assert.match(plan({ tasks: [t("a", { size: "S" })] }).warnings[0], /quick lane/);
  assert.equal(plan({ tasks: [t("a"), t("b")] }).warnings.length, 0);
});
