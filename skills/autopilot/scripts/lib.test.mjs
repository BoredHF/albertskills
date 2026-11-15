import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, pickCard, brief } from "./lib.mjs";
import { parseCards } from "./cards.mjs";

const cards = (lines) => ["why: learn", "v1: it runs", ...lines].join("\n");
const on = { on: true, used: 0, max: 3 };
const base = { flag: on, tier: "GREEN", lastMessage: "Done T01.", state: "blocked: -" };

test("off flag never blocks", () => {
  assert.equal(decide({ ...base, flag: { on: false } }).block, false);
});

test("continues on an open delegate card", () => {
  const r = decide({ ...base, cardsText: cards(["- [ ] T01 | delegate | S | v1 | Gradle setup"]) });
  assert.equal(r.block, true);
  assert.match(r.reason, /T01.*Gradle setup/);
});

test("drive card and started pair card wrap up for the user", () => {
  assert.match(decide({ ...base, cardsText: cards(["- [ ] T02 | drive | M | v1 | Core loop"]) }).patch.wrapping, /drive/);
  assert.match(decide({ ...base, cardsText: cards(["- [~] T03 | pair | M | v1 | Parser"]) }).patch.wrapping, /skeleton/);
});

test("unstarted pair card continues so the skeleton gets written", () => {
  assert.equal(decide({ ...base, cardsText: cards(["- [ ] T03 | pair | M | v1 | Parser"]) }).block, true);
});

test("stops when Claude asks a question or hits the step cap or bad tier", () => {
  const c = cards(["- [ ] T01 | delegate | S | v1 | X"]);
  assert.equal(decide({ ...base, cardsText: c, lastMessage: "Which DB do you want?" }).block, false);
  const capped = decide({ ...base, cardsText: c, flag: { ...on, used: 3 } });
  assert.equal(capped.block, true, "cap gets one wrap-up prompt so Claude reports back");
  assert.equal(capped.patch.wrapping, "step cap reached");
  assert.equal(decide({ ...base, cardsText: c, tier: "RED" }).patch.wrapping, "budget tier RED");
  assert.equal(decide({ ...base, cardsText: c, flag: { ...on, wrapping: "x" } }).turnOff, true);
});

test("stops when state.md is blocked", () => {
  const c = cards(["- [ ] T01 | delegate | S | v1 | X"]);
  assert.equal(decide({ ...base, cardsText: c, state: "blocked: need API key" }).block, false);
});

test("goal mode without cards runs until [autopilot:done]", () => {
  const flag = { ...on, goal: "fix the build" };
  assert.equal(decide({ ...base, flag }).block, true);
  assert.equal(decide({ ...base, flag, lastMessage: "Build green. [autopilot:done]" }).turnOff, true);
});

test("pickCard prefers in-progress, skips later cards", () => {
  const list = parseCards(cards(["- [ ] T01 | delegate | S | later | A", "- [ ] T02 | delegate | S | v1 | B"]));
  assert.equal(pickCard(list).id, "T02");
});

test("brief summarises cards and state", () => {
  const text = brief({ cardsText: cards(["- [x] T01 | delegate | S | v1 | A", "- [ ] T02 | drive | M | v1 | B"]), state: "next: T02", flag: on });
  assert.match(text, /v1: it runs/);
  assert.match(text, /1 done, open: T02\(drive\)/);
  assert.match(text, /autopilot ON/);
});

const plan = (steps) => ["# Mission", "Goal: fix build", "Done when: npm test passes", "## Steps", ...steps, "## Log"].join("\n");
const mission = { ...on, max: 10, mode: "mission", goal: "fix build" };

test("mission mode points at the next unchecked step", () => {
  const r = decide({ ...base, flag: mission, planText: plan(["- [x] read errors", "- [ ] fix imports"]) });
  assert.equal(r.block, true);
  assert.match(r.reason, /fix imports/);
  assert.equal(r.patch.lastStep, "fix imports");
});

test("mission mode with all steps checked asks for verify + report", () => {
  const r = decide({ ...base, flag: mission, planText: plan(["- [x] a", "- [x] b"]) });
  assert.match(r.reason, /Done when/);
  assert.equal(r.patch.wrapping, "all steps checked");
});

test("mission mode wraps up when stuck on the same step", () => {
  const r = decide({ ...base, flag: { ...mission, lastStep: "fix imports", repeat: 2 }, planText: plan(["- [ ] fix imports"]) });
  assert.match(r.patch.wrapping, /stuck/);
});

test("mission flag wins over cards.md", () => {
  const r = decide({ ...base, flag: mission, cardsText: cards(["- [ ] T01 | delegate | S | v1 | X"]), planText: plan(["- [ ] step one"]) });
  assert.match(r.reason, /step one/);
});

test("a run only drives the session that started it", async () => {
  const { ownership } = await import("./lib.mjs");
  assert.equal(ownership({ on: true, session: "A" }, "A"), "own");
  assert.equal(ownership({ on: true, session: "A" }, "B"), "other");
  assert.equal(ownership({ on: true }, "B"), "claim");
  assert.equal(ownership({ on: false, session: "A" }, "A"), "off");
});

test("brief warns other sessions instead of telling them to continue", () => {
  const flag = { on: true, session: "A", goal: "scaffold" };
  const other = brief({ flag, planText: "- [ ] step", sessionId: "B" });
  assert.match(other, /another session/);
  assert.doesNotMatch(other, /keep going/);
  assert.match(brief({ flag, planText: "- [ ] step", sessionId: "A" }), /keep going/);
});
