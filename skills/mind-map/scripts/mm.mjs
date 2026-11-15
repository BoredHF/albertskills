#!/usr/bin/env node
// Mind-map helper: lets Claude change the map with small patches instead of rewriting map-data.js.
// Usage (<dir> is optional after first use; defaults to mindmaps/.current):
//   node mm.mjs init "<title>"            create mindmaps/<slug> with the viewer
//   node mm.mjs list                      list maps with progress
//   node mm.mjs show [dir] [node-id]      compact outline, or one node in full
//   node mm.mjs turn [dir] <<patch        apply patch, then wait for the viewer (run in background)
//   node mm.mjs wait [dir]                just wait for the viewer (run in background)
//   node mm.mjs apply [dir] [patch.json]  apply a patch without waiting
//   node mm.mjs export [dir]              rebuild export/<slug>.md and .json
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { exportMap } from "./export.mjs";

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");
const ID_RE = /^[a-z0-9][a-z0-9-]*$|^[unvx]-[a-z0-9]+$/;
const LIST_KEYS = ["details", "quotes", "open", "connects"];
const FIELD_KEYS = ["label", "summary", "look", "feel", "interactive", "suggested"];

class MapError extends Error {}
function fail(msg) { throw new MapError(msg); }
function dataFile(dir) { return path.join(dir, "map-data.js"); }
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "map"; }

function load(dir) {
  const file = dataFile(dir);
  if (!fs.existsSync(file)) fail("no map at " + file);
  const sandbox = { window: {} };
  try { vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox); } catch (e) { fail("map-data.js is not valid: " + e.message); }
  const data = sandbox.window.MIND_MAP;
  if (!data || !data.root) fail("map-data.js has no MIND_MAP.root");
  return data;
}
function save(dir, data) {
  fs.writeFileSync(dataFile(dir), "window.MIND_MAP = " + JSON.stringify(data, null, 1) + ";\n", "utf8");
  exportMap(dir, data);   // keep export/<slug>.md and .json current; costs no tokens
}

function walk(n, fn, parent = null, depth = 0) {
  fn(n, parent, depth);
  (n.children || []).forEach((c) => walk(c, fn, n, depth + 1));
}
function indexOf(data) {
  const byId = {}, parentOf = {};
  walk(data.root, (n, p) => { byId[n.id] = n; parentOf[n.id] = p; });
  return { byId, parentOf };
}

// Leaf: done when all three lenses are answered. Parent: done when every child is done
// (its own lenses are optional, so group nodes like "Design" can finish).
function statusOf(n) {
  const kids = (n.children || []).map(statusOf);
  const lenses = [n.look, n.feel, n.interactive];
  const clean = !n.suggested && !(n.open || []).length;
  const own = n.summary || lenses.some(Boolean) || (n.details || []).length;
  let status;
  if (kids.length) status = clean && kids.every((k) => k === "done") ? "done" : (own || kids.some((k) => k !== "empty")) ? "partial" : "empty";
  else status = clean && lenses.every(Boolean) ? "done" : own ? "partial" : "empty";
  n.status = status;
  return status;
}
function stats(data) {
  const s = { done: 0, partial: 0, empty: 0, open: 0, total: 0, weak: [] };
  statusOf(data.root);
  walk(data.root, (n, p) => {
    if (!p) return;
    s.total++; s[n.status]++; s.open += (n.open || []).length;
    if (n.status !== "done") s.weak.push(n);
  });
  const score = (n) => (n.status === "empty" ? 3 : 1) + (n.open || []).length;
  s.weak.sort((a, b) => score(b) - score(a));
  s.pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
  return s;
}
function statLine(data, s) {
  const a = data.agreed || {};
  return `${data.title} · round ${data.round || 0} · ${s.pct}% done (${s.done}/${s.total}) · ${s.open} open · ` +
    `agreed: claude=${!!a.agent} user=${!!a.user}`;
}
function missing(n) {
  if ((n.children || []).length) return "";
  return ["look", "feel", "interactive"].filter((k) => !n[k]).map((k) => k[0].toUpperCase()).join("");
}
function outlineLine(n, depth) {
  const bits = [`${"  ".repeat(depth)}${n.id} "${n.label}"`];
  if (depth) bits.push(`[${n.status}${missing(n) ? " -" + missing(n) : ""}]`);
  if (n.suggested) bits.push("(suggested)");
  if ((n.open || []).length) bits.push(`${n.open.length}?`);
  if ((n.details || []).length) bits.push(`≡${n.details.length}`);
  if ((n.connects || []).length) bits.push("→" + n.connects.join(","));
  return bits.join(" ");
}

// ---------- commands ----------
function cmdInit(dir, title) {
  if (!dir || !title) fail('usage: init <dir> "<title>"');
  if (fs.existsSync(dataFile(dir))) fail("map already exists at " + dir + " (use show to resume)");
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(ASSETS, "template.html"), path.join(dir, "index.html"));
  ["viewer.js", "viewer-ui.js", "viewer-expand.js"].forEach((f) => fs.copyFileSync(path.join(ASSETS, f), path.join(dir, f)));
  const data = { slug: path.basename(dir) || slugify(title), title, core: "", round: 0, working: null,
    agreed: { agent: false, user: false }, root: { id: "root", label: title, children: [] }, log: [], merged: [] };
  save(dir, data);
  console.log("created " + dir);
}

function cmdList(root = "mindmaps") {
  if (!fs.existsSync(root)) { console.log("no maps yet"); return; }
  const dirs = fs.readdirSync(root).filter((d) => fs.existsSync(dataFile(path.join(root, d))));
  if (!dirs.length) { console.log("no maps yet"); return; }
  dirs.forEach((d) => { const data = load(path.join(root, d)); console.log(d + ": " + statLine(data, stats(data))); });
}

function cmdShow(dir, id) {
  const data = load(dir);
  const s = stats(data);
  if (id) {
    const n = indexOf(data).byId[id];
    if (!n) fail("no node " + id);
    const { children, ...rest } = n;
    console.log(JSON.stringify({ ...rest, children: (children || []).map((c) => c.id) }, null, 1));
    return;
  }
  console.log(statLine(data, s));
  console.log("core: " + (data.core || "(not set)"));
  walk(data.root, (n, p, depth) => console.log(outlineLine(n, depth)));
  console.log("weakest: " + s.weak.slice(0, 3).map((n) => n.id).join(", "));
}

function cmdWorking(dir, id) {
  const data = load(dir);
  data.working = !id || id === "none" ? null : id;
  save(dir, data);
  console.log("working: " + (data.working || "none"));
}

function readPatch(file) {
  const raw = file ? fs.readFileSync(file, "utf8") : fs.readFileSync(0, "utf8");
  try { return JSON.parse(raw); } catch (e) { return fail("patch is not valid JSON: " + e.message); }
}

function applyNode(data, op, log) {
  const { byId, parentOf } = indexOf(data);
  if (!op.id || !ID_RE.test(op.id)) fail("bad node id: " + op.id);
  const existing = byId[op.id];
  if (op.remove) {
    if (!existing || op.id === "root") fail("cannot remove " + op.id);
    const p = parentOf[op.id];
    p.children = p.children.filter((c) => c.id !== op.id);
    walk(data.root, (n) => { if (n.connects) n.connects = n.connects.filter((c) => c !== op.id); });
    log.push("- " + op.id);
    return;
  }
  let node = existing;
  if (!node) {
    const parent = byId[op.parent || "root"];
    if (!parent) fail("unknown parent " + op.parent + " for " + op.id);
    if (!op.label) fail("new node " + op.id + " needs a label");
    node = { id: op.id, label: op.label, children: [] };
    parent.children = parent.children || [];
    parent.children.push(node);
    log.push("+ " + op.id);
  } else {
    if (op.parent && parentOf[op.id] && parentOf[op.id].id !== op.parent) moveNode(data, op.id, op.parent);
    log.push("~ " + op.id);
  }
  FIELD_KEYS.forEach((k) => { if (k in op) { if (op[k] === null) delete node[k]; else node[k] = op[k]; } });
  LIST_KEYS.forEach((k) => {
    if (op[k]) node[k] = op[k].slice();
    if (op[k + "+"]) node[k] = [...new Set([...(node[k] || []), ...op[k + "+"]])];
    if (op[k + "-"]) node[k] = op[k + "-"].includes("*") ? [] : (node[k] || []).filter((v) => !op[k + "-"].includes(v));
    if (node[k] && !node[k].length) delete node[k];
  });
}

function moveNode(data, id, parentId) {
  const { byId, parentOf } = indexOf(data);
  const target = byId[parentId];
  if (!target) fail("unknown parent " + parentId);
  let inside = false;
  walk(byId[id], (n) => { if (n.id === parentId) inside = true; });
  if (inside) fail("cannot move " + id + " under its own child");
  const old = parentOf[id];
  old.children = old.children.filter((c) => c.id !== id);
  target.children = target.children || [];
  target.children.push(byId[id]);
}

function cmdApply(dir, file) { console.log(applyPatch(dir, readPatch(file))); }

// Ids the last `wait` delivered are merged automatically, so Claude never copies them.
function takeReceived(dir) {
  const f = path.join(dir, ".received");
  if (!fs.existsSync(f)) return [];
  const ids = fs.readFileSync(f, "utf8").split("\n").filter(Boolean);
  fs.unlinkSync(f);
  return ids;
}

// An answered question (id a-<askId>) is ticked off its node and dropped from the batch automatically.
function resolveAnswered(data, ids) {
  const done = new Set(ids.filter((i) => i.startsWith("a-")).map((i) => i.slice(2)));
  if (!done.size || !data.asks) return;
  const { byId } = indexOf(data);
  data.asks.filter((a) => done.has(a.id)).forEach((a) => {
    const n = byId[a.node];
    if (n && n.open) { n.open = n.open.filter((q) => q !== a.q); if (!n.open.length) delete n.open; }
  });
  data.asks = data.asks.filter((a) => !done.has(a.id));
}
// New questions join the unanswered ones; each is also listed as an open question on its node.
function setAsks(data, asks) {
  if (!Array.isArray(asks)) fail("ask must be a list");
  const { byId } = indexOf(data), stamp = Date.now().toString(36), prev = data.asks;
  data.asks = asks.slice(0, 5).map((a, i) => {
    if (!a || typeof a.q !== "string") fail("each ask needs a q");
    const node = byId[a.node] ? a.node : "root";
    if (node !== "root") byId[node].open = [...new Set([...(byId[node].open || []), a.q])];
    const out = { id: "k" + stamp + i, q: a.q, node };
    if (a.guess) out.guess = String(a.guess);
    if (Array.isArray(a.options)) out.options = a.options.slice(0, 4).map(String);
    return out;
  });
  data.asks = [...(prev || []), ...data.asks].slice(-5);   // unanswered cards stay; newest 5 shown
}

// Several core ideas on one canvas: the first new core turns the map into a canvas whose hidden
// root holds every core. The old root keeps its content under a new id.
function ensureCanvas(data) {
  if (data.canvas) return;
  const old = data.root, { byId } = indexOf(data);
  let id = slugify(old.label), n = 2;
  while (byId[id]) id = slugify(old.label) + "-" + n++;
  walk(old, (m) => { if (m.connects) m.connects = m.connects.map((c) => (c === "root" ? id : c)); });
  (data.asks || []).forEach((a) => { if (a.node === "root") a.node = id; });
  old.id = id;
  if (data.core && !old.summary) old.summary = data.core;
  data.root = { id: "root", label: data.title, children: [old] };
  data.canvas = true;
}
function addCore(data, c, log) {
  if (!c || !c.label) fail("cores+ items need a label");
  ensureCanvas(data);
  const id = c.id || slugify(c.label);
  if (indexOf(data).byId[id]) fail("id taken: " + id);
  const node = { id, label: c.label, children: [] };
  if (c.summary) node.summary = c.summary;
  data.root.children.push(node);
  log.push("+core " + id);
}

function applyPatch(dir, patch) {
  const data = load(dir);
  const log = [];
  ["title", "core"].forEach((k) => { if (patch[k]) data[k] = patch[k]; });
  if (patch.title) data.root.label = patch.title;
  const wasCanvas = !!data.canvas;
  (patch["cores+"] || []).forEach((c) => addCore(data, c, log));   // before nodes, so nodes can go under new cores
  // a map that just became a canvas: "root" in this patch still means the old core, not the hidden canvas root
  const oldCore = !wasCanvas && data.canvas ? data.root.children[0].id : null;
  const short = [
    ...(patch.want || []).map((id) => ({ id, suggested: false })),
    ...Object.entries(patch.move || {}).map(([id, parent]) => ({ id, parent })),
  ];
  [...(patch.nodes || []), ...short].map((op) => (oldCore && op.parent === "root" ? { ...op, parent: oldCore } : op))
    .forEach((op) => applyNode(data, op, log));
  const merged = [...(patch.merged || []), ...takeReceived(dir)];
  if (merged.length) data.merged = [...new Set([...(data.merged || []), ...merged])];
  resolveAnswered(data, merged);
  if (patch.ask) setAsks(data, patch.ask);
  if (patch.say) data.chat = [...(data.chat || []), { from: "claude", text: String(patch.say), at: Date.now() }].slice(-40);
  if (patch.agreed) data.agreed = { ...(data.agreed || {}), ...patch.agreed };
  if (patch.log) {
    data.round = (data.round || 0) + 1;
    data.log = [...(data.log || []), { round: data.round, focus: patch.log.focus || "", learned: patch.log.learned || "" }];
  }
  data.working = null;
  const s = stats(data);
  if (data.agreed && (s.pct < 100 || s.open)) data.agreed.agent = false;   // can't be complete with gaps
  save(dir, data);
  // one line: changes | progress | where to look next
  return `${log.join(" ") || "="} | r${data.round || 0} ${s.pct}% ${s.open}? | weak ` +
    s.weak.slice(0, 3).map((n) => n.id + (missing(n) ? "-" + missing(n) : "")).join(" ");
}

function cmdExport(dir) { const data = load(dir); stats(data); console.log("exported to " + exportMap(dir, data)); }

// ---------- live loop: one background call per round ----------
const LINE = {
  add: (p) => `ADD ${p.id}>${p.target}: ${p.label}`, note: (p) => `DETAIL ${p.target}: ${p.text}`,
  want: (p) => `WANT ${p.target}`, skip: (p) => `DONT ${p.target}`, expand: (p) => `EXPAND ${p.target}${p.label ? " (" + p.label + ")" : ""}${p.text ? ": " + p.text : " (guess)"}`, fill: (p) => `FILL ${p.target}`,
  message: (p) => `SAY ${p.text}`,
  organize: (p) => `ORGANIZE ${p.target}`,
  core: (p) => `CORE ${p.id}: ${p.label}`,
  answer: (p) => `ANSWER ${p.target} "${p.q}": ${p.text}`,
};
// Only one waiter: each claims .waiter with a token; an older waiter sees the new token and quits.
const TOKEN = process.pid + "-" + Date.now().toString(36);
function stopOldWaiter(dir) { fs.writeFileSync(path.join(dir, ".waiter"), TOKEN, "utf8"); }
function replaced(dir) {
  try { return fs.readFileSync(path.join(dir, ".waiter"), "utf8") !== TOKEN; } catch { return false; }
}
function readInbox(dir) {
  try { const v = JSON.parse(fs.readFileSync(path.join(dir, "inbox.json"), "utf8")); return Array.isArray(v) ? v : []; } catch { return []; }
}
// Blocks until the viewer sends something; marks the map as "working" so the user sees it react instantly.
function cmdWait(dir, minsArg) {
  stopOldWaiter(dir);
  const deadline = Date.now() + (Number(minsArg) || 120) * 60000;
  const tick = () => {
    if (replaced(dir)) { console.log("replaced"); process.exit(0); }
    const all = readInbox(dir);
    if (all.length) {
      fs.writeFileSync(path.join(dir, "inbox.json"), "[]", "utf8");
      const { done, items } = autoApply(dir, all);
      if (!items.length) { setTimeout(tick, 1000); return; }   // nothing needs thinking: Claude stays asleep
      fs.appendFileSync(path.join(dir, ".received"), items.map((p) => p.id).join("\n") + "\n", "utf8");
      const data = load(dir), focus = items.find((p) => p.kind !== "message" && p.target !== "root");
      data.working = focus ? focus.target : "root";
      save(dir, data);
      if (done) console.log("auto: " + done);
      items.forEach((p) => console.log((LINE[p.kind] || ((x) => "RAW " + JSON.stringify(x)))(p)));
      printContext(data, items);
      process.exit(0);
    }
    if (Date.now() > deadline) { console.log("idle"); process.exit(0); }
    setTimeout(tick, 1000);
  };
  tick();
}
// Want / don't want / add / detail / core need no thinking, so the script applies them itself.
const MECHANICAL = {
  want: (p) => ({ nodes: [{ id: p.target, suggested: false }] }),
  skip: (p) => ({ nodes: [{ id: p.target, remove: true }] }),
  add: (p) => ({ nodes: [{ id: p.id, parent: p.target, label: p.label }] }),
  note: (p) => ({ nodes: [{ id: p.target, "details+": [p.text] }] }),
  core: (p) => ({ "cores+": [{ id: p.id, label: p.label }] }),
};
function autoApply(dir, items) {
  const mech = items.filter((p) => MECHANICAL[p.kind]), rest = items.filter((p) => !MECHANICAL[p.kind]);
  if (!mech.length) return { done: "", items: rest };
  const patch = mech.map((p) => MECHANICAL[p.kind](p)).reduce((a, b) => ({
    "cores+": [...(a["cores+"] || []), ...(b["cores+"] || [])], nodes: [...(a.nodes || []), ...(b.nodes || [])],
  }), {});
  try {
    const line = applyPatch(dir, { ...patch, merged: mech.map((p) => p.id) });
    return { done: line.split(" | ")[0], items: rest };
  } catch (e) {
    if (!(e instanceof MapError)) throw e;
    return { done: "", items };   // something didn't fit: hand everything to Claude unchanged
  }
}
// Expand / organize lines arrive with the subtree attached, so Claude doesn't need a `show` call.
function clip(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function contextLine(n, depth) {
  const lens = [["L", n.look], ["F", n.feel], ["I", n.interactive]].filter((x) => x[1]).map((x) => x[0] + ":" + clip(x[1], 50));
  return "  ".repeat(depth) + n.id + (n.suggested ? "?" : "") + " " + clip(n.label, 40) +
    (n.summary ? " — " + clip(n.summary, 70) : "") + (lens.length ? " | " + lens.join(" ") : "") +
    ((n.details || []).length ? " | ≡ " + n.details.map((d) => clip(d, 40)).join("; ") : "");
}
function printContext(data, items) {
  const { byId } = indexOf(data);
  const ids = [...new Set(items.filter((p) => p.kind === "expand" || p.kind === "fill" || p.kind === "organize").map((p) => p.target))];
  ids.forEach((id) => {
    const n = byId[id];
    if (!n) return;
    const whole = n === data.root, out = [];
    walk(n, (m, p, d) => { if (out.length < 60 && d <= (whole ? 2 : 3)) out.push(whole ? outlineLine(m, d) : contextLine(m, d)); });
    console.log("=== " + id + "\n" + out.join("\n"));
  });
}

// Apply the patch on stdin, print the result, then keep waiting for the next send.
function cmdTurn(dir) {
  console.log(applyPatch(dir, readPatch()));
  console.log("---");
  cmdWait(dir);
}

// The map dir is optional: defaults to the last one used (mindmaps/.current).
const CURRENT = path.join("mindmaps", ".current");
function resolveDir(args) {
  if (args[0] && fs.existsSync(dataFile(args[0]))) {
    fs.mkdirSync("mindmaps", { recursive: true });
    fs.writeFileSync(CURRENT, args[0], "utf8");
    return [args[0], ...args.slice(1)];
  }
  const cur = fs.existsSync(CURRENT) ? fs.readFileSync(CURRENT, "utf8").trim() : "";
  if (!cur || !fs.existsSync(dataFile(cur))) fail("no current map: pass mindmaps/<slug> once");
  return [cur, ...args];
}
function cmdInitTitle(...a) {
  const [dir, title] = a.length > 1 ? a : [path.join("mindmaps", slugify(a[0] || "")), a[0]];
  cmdInit(dir, title);
  fs.writeFileSync(CURRENT, dir, "utf8");
}

const [cmd, ...args] = process.argv.slice(2);
const withDir = { show: cmdShow, working: cmdWorking, apply: cmdApply, export: cmdExport, wait: cmdWait, turn: cmdTurn };
const plain = { init: cmdInitTitle, list: cmdList };
try {
  if (withDir[cmd]) withDir[cmd](...resolveDir(args));
  else if (plain[cmd]) plain[cmd](...args);
  else fail("commands: init, list, show, turn, wait, apply, working, export");
} catch (e) {
  if (!(e instanceof MapError)) throw e;
  console.error("error: " + e.message);
  process.exit(1);
}
