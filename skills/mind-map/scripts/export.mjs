#!/usr/bin/env node
// Writes the map as a short human doc (<slug>.md) and clean data for other skills (<slug>.json).
// No Claude tokens: pure formatting of map-data.js.
//   node export.mjs <dir>
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const LENSES = [["look", "Looks"], ["feel", "Feels"], ["interactive", "Player does"]];
const STATUS_ICON = { done: "✅", partial: "🟡", empty: "⚪" };

const isNA = (v) => typeof v === "string" && v.trim().toLowerCase() === "n/a";
const list = (v) => (Array.isArray(v) ? v : []);

function labels(data) {
  const byId = {};
  const walk = (n) => { byId[n.id] = n.label; list(n.children).forEach(walk); };
  walk(data.root);
  return byId;
}

function countAll(data) {
  const c = { done: 0, partial: 0, empty: 0, open: 0, total: 0 };
  const walk = (n, depth) => {
    if (depth) { c.total++; c[n.status || "empty"]++; c.open += list(n.open).length; }
    list(n.children).forEach((k) => walk(k, depth + 1));
  };
  walk(data.root, 0);
  c.pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
  return c;
}

// One compact block per node; empty fields are skipped entirely.
function nodeBlock(n, depth, names, out) {
  const heading = "#".repeat(Math.min(depth + 1, 6));
  const flags = [STATUS_ICON[n.status || "empty"], n.suggested ? "_idea, not confirmed_" : ""].filter(Boolean).join(" ");
  out.push(`${heading} ${n.label} ${flags}`.trim(), "");
  if (n.summary) out.push(n.summary, "");
  const lenses = LENSES.filter(([k]) => n[k] && !isNA(n[k])).map(([k, name]) => `- **${name}:** ${n[k]}`);
  const facts = list(n.details).map((d) => `- ${d}`);
  if (lenses.length || facts.length) out.push(...lenses, ...facts, "");
  const links = list(n.connects).map((id) => names[id]).filter(Boolean);
  if (links.length) out.push(`↔ ${links.join(", ")}`, "");
  list(n.quotes).forEach((q) => out.push(`> "${q}"`));
  if (list(n.quotes).length) out.push("");
  list(n.open).forEach((q) => out.push(`- [ ] ${q}`));
  if (list(n.open).length) out.push("");
  list(n.children).forEach((k) => nodeBlock(k, depth + 1, names, out));
}

function toMarkdown(data) {
  const names = labels(data), c = countAll(data), a = data.agreed || {};
  const out = [`# ${data.title}`, ""];
  if (data.core) out.push(`**${data.core}**`, "");
  out.push(`${c.pct}% done · ${c.done}/${c.total} pieces · ${c.open} open questions · round ${data.round || 0}` +
    (a.agent && a.user ? " · ✅ agreed complete" : ""), "");
  out.push("## At a glance", "");
  list(data.root.children).forEach((b) => {
    const kids = list(b.children).map((k) => k.label).join(", ");
    out.push(`- ${STATUS_ICON[b.status || "empty"]} **${b.label}**${kids ? " — " + kids : ""}`);
  });
  out.push("", "---", "");
  list(data.root.children).forEach((b) => nodeBlock(b, 1, names, out));
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// Clean, flat-friendly data: no viewer internals, each node knows its path.
function toJson(data) {
  const nodes = [];
  const walk = (n, trail) => {
    const p = [...trail, n.label];
    if (trail.length) {
      const node = { id: n.id, label: n.label, path: p.slice(1).join(" > "), parent: trail.length > 1 ? n._parent : null,
        status: n.status || "empty" };
      ["summary", "look", "feel", "interactive"].forEach((k) => { if (n[k]) node[k] = n[k]; });
      ["details", "connects", "quotes", "open"].forEach((k) => { if (list(n[k]).length) node[k] = n[k]; });
      if (n.suggested) node.suggested = true;
      node.children = list(n.children).map((k) => k.id);
      nodes.push(node);
    }
    list(n.children).forEach((k) => { k._parent = n.id; walk(k, p); });
  };
  walk(data.root, []);
  nodes.forEach((n) => { if (n.parent === "root") n.parent = null; });
  return { title: data.title, core: data.core || "", round: data.round || 0, agreed: data.agreed || {},
    branches: list(data.root.children).map((b) => b.id), nodes };
}

export function exportMap(dir, data) {
  const slug = data.slug || path.basename(path.resolve(dir));
  const outDir = path.join(dir, "export");
  fs.mkdirSync(outDir, { recursive: true });
  const clone = JSON.parse(JSON.stringify(data));
  fs.writeFileSync(path.join(outDir, slug + ".md"), toMarkdown(clone), "utf8");
  fs.writeFileSync(path.join(outDir, slug + ".json"), JSON.stringify(toJson(clone), null, 1), "utf8");
  return outDir;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: export.mjs <dir>"); process.exit(1); }
  const sandbox = { window: {} };
  try { vm.runInNewContext(fs.readFileSync(path.join(dir, "map-data.js"), "utf8"), sandbox); }
  catch (e) { console.error("error: cannot read map: " + e.message); process.exit(1); }
  console.log("exported to " + exportMap(dir, sandbox.window.MIND_MAP));
}
