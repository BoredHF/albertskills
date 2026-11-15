#!/usr/bin/env node
// Plans a delegation: picks a model and agent per task, groups tasks into parallel waves
// (dependencies first, never two writers on the same files in one wave), and flags bad tasks.
// Usage: node waves.mjs [plan.json] [--tier GREEN|AMBER|RED] [--json]   (default file: .work/delegate.json)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const MAX_PARALLEL = 4;
const SIZES = ["S", "M", "L"];
const KINDS = ["mechanical", "code", "research", "design"];

// Which model and agent fit a task. Design stays with the main thread: judgment doesn't delegate well.
export function route(task, tier = "GREEN") {
  if (task.kind === "design") return { where: "inline", why: "design calls stay in the main thread" };
  if (task.kind === "research") return { where: "agent", agent: "Explore", model: task.size === "S" ? "haiku" : "sonnet" };
  if (task.kind === "mechanical") return { where: "agent", agent: "delegate-worker", model: task.size === "L" ? "sonnet" : "haiku" };
  const model = task.size === "S" ? "haiku" : task.size === "L" && tier === "GREEN" && task.hard ? "opus" : "sonnet";
  return { where: "agent", agent: "delegate-worker", model };
}

export function validate(tasks) {
  const errors = [];
  const ids = new Set();
  for (const t of tasks) {
    if (!t.id) errors.push("a task has no id");
    else if (ids.has(t.id)) errors.push(`${t.id}: duplicate id`);
    ids.add(t.id);
    if (!t.title) errors.push(`${t.id}: no title`);
    if (!SIZES.includes(t.size)) errors.push(`${t.id}: size must be S, M or L`);
    if (!KINDS.includes(t.kind)) errors.push(`${t.id}: kind must be one of ${KINDS.join(", ")}`);
    if (t.kind !== "design" && !t.done) errors.push(`${t.id}: no done check (a command or observable result the caller can verify)`);
  }
  for (const t of tasks) for (const d of t.deps || []) if (!ids.has(d)) errors.push(`${t.id}: depends on unknown ${d}`);
  return errors;
}

const norm = (p) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
// Same file, or one path is a folder holding the other.
export function overlaps(a = [], b = []) {
  return a.some((x) => b.some((y) => {
    const [p, q] = [norm(x), norm(y)];
    return p === q || p.startsWith(q + "/") || q.startsWith(p + "/");
  }));
}

const writes = (t) => t.kind !== "research";

// Kahn-style layering; within a layer, a writer that clashes with one already placed waits a wave.
export function waves(tasks) {
  const done = new Set();
  const left = tasks.filter((t) => route(t).where === "agent");
  const out = [];
  while (left.length) {
    const ready = left.filter((t) => (t.deps || []).every((d) => done.has(d) || !left.some((l) => l.id === d)));
    if (!ready.length) throw new Error(`dependency cycle among: ${left.map((t) => t.id).join(", ")}`);
    const wave = [];
    for (const t of ready) {
      if (wave.length >= MAX_PARALLEL) break;
      const blind = writes(t) && !(t.files || []).length; // a writer with unknown files runs alone
      const clash = wave.some((w) => (writes(t) || writes(w)) && overlaps(t.files, w.files));
      if (blind && wave.length) continue;
      if (wave.some((w) => writes(w) && !(w.files || []).length)) break;
      if (!clash) wave.push(t);
    }
    wave.forEach((t) => {
      done.add(t.id);
      left.splice(left.indexOf(t), 1);
    });
    out.push(wave);
  }
  return out;
}

export function plan(input, tier = "GREEN") {
  const tasks = input.tasks || [];
  const errors = validate(tasks);
  if (tier === "RED" || tier === "OUT") return { errors: [`budget tier ${tier}: don't delegate, finish the current step inline`], waves: [], inline: [] };
  if (errors.length) return { errors, waves: [], inline: [] };
  // Deps on inline tasks are satisfied before dispatch (the main thread does those first).
  const inline = tasks.filter((t) => route(t, tier).where === "inline");
  const inlineIds = new Set(inline.map((t) => t.id));
  const agentTasks = tasks.map((t) => ({ ...t, deps: (t.deps || []).filter((d) => !inlineIds.has(d)) }));
  const grouped = waves(agentTasks).map((w) => w.map((t) => ({ ...t, ...route(t, tier) })));
  const warnings = [];
  if (tasks.length === 1) warnings.push("one task: use the quick lane (one agent, short brief), no plan file needed");
  return { errors: [], waves: grouped, inline, warnings };
}

function format(p) {
  if (p.errors.length) return ["NOT READY", ...p.errors.map((e) => `  ✗ ${e}`)].join("\n");
  const lines = [];
  if (p.inline.length) lines.push(`inline first: ${p.inline.map((t) => `${t.id} (${t.title})`).join(", ")}`);
  p.waves.forEach((w, i) => {
    lines.push(`wave ${i + 1}${w.length > 1 ? ` · ${w.length} in parallel, one message` : ""}:`);
    for (const t of w) lines.push(`  ${t.id} → ${t.agent} · ${t.model} · ${t.size} ${t.kind} · ${t.title}${(t.files || []).length ? ` · files: ${t.files.join(", ")}` : ""}`);
  });
  for (const w of p.warnings) lines.push(`! ${w}`);
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const tierAt = args.indexOf("--tier");
  const tier = tierAt >= 0 ? args[tierAt + 1] : "GREEN";
  const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--tier") || ".work/delegate.json";
  if (!existsSync(file)) return console.log(`no plan file at ${file}`), process.exit(1);
  const result = plan(JSON.parse(readFileSync(file, "utf8")), tier);
  console.log(args.includes("--json") ? JSON.stringify(result, null, 2) : format(result));
  if (result.errors.length) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (err) {
    console.log(`waves: ${err.message}`);
    process.exit(1);
  }
}
