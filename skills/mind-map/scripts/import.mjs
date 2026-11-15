#!/usr/bin/env node
// Turns Markdown notes into mind maps without Claude reading them.
//   node import.mjs <file.md | folder> [--out mindmaps]
// Headings become branches, nested bullets become sub-branches, leaf bullets become details,
// "Look:/Feel:/Does:" lines fill the lenses, "- [ ]" become open questions, "> " become quotes.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(HERE, "..", "assets");
const LENS = { look: "look", looks: "look", feel: "feel", feels: "feel", interactive: "interactive",
  "player does": "interactive", does: "interactive", summary: "summary", what: "summary" };
const SKIP_HEADINGS = /^at a glance$/i;

const fail = (m) => { console.error("error: " + m); process.exit(1); };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "node";
const clean = (s) => s.replace(/[✅🟡⚪]/g, "").replace(/\*\*|__|`/g, "").trim();

function makeIds() {
  const used = new Set(["root"]);
  return (label) => {
    let id = slugify(label), n = 2;
    while (used.has(id)) id = slugify(label) + "-" + n++;
    used.add(id);
    return id;
  };
}

function newNode(label, ids) {
  const suggested = /_idea, not confirmed_/.test(label);
  const node = { id: ids(clean(label.replace(/_idea, not confirmed_/, ""))), label: clean(label.replace(/_idea, not confirmed_/, "")), children: [] };
  if (suggested) node.suggested = true;
  return node;
}
const push = (node, key, value) => { (node[key] = node[key] || []).push(value); };

// "Look: blue" / "**Looks:** blue" -> ["look", "blue"]
function lensOf(text) {
  const m = clean(text).match(/^([A-Za-z ]{2,14}):\s+(.+)$/);
  return m && LENS[m[1].toLowerCase()] ? [LENS[m[1].toLowerCase()], m[2]] : null;
}

function addItem(item, parent, ids, atRoot) {
  const text = item.text;
  const q = text.match(/^\[[ xX]\]\s*(.+)$/);
  if (q) { push(parent, "open", clean(q[1])); return; }
  const lens = lensOf(text);
  if (lens && !item.children.length) { parent[lens[0]] = lens[1]; return; }
  if (item.children.length || atRoot) {
    const node = newNode(text, ids);
    parent.children.push(node);
    item.children.forEach((c) => addItem(c, node, ids, false));
    return;
  }
  push(parent, "details", clean(text));
}

function parse(md, fallbackTitle) {
  const ids = makeIds();
  const root = { id: "root", label: fallbackTitle, children: [] };
  const map = { title: fallbackTitle, core: "", root, links: [] };
  let stack = [{ level: 1, node: root }], list = [], para = [], skipping = false, fenced = false, titled = false;
  const current = () => stack[stack.length - 1].node;

  const flushList = () => {
    const items = [], open = [];
    list.forEach(({ indent, text }) => {
      const item = { text, children: [] };
      while (open.length && open[open.length - 1].indent >= indent) open.pop();
      (open.length ? open[open.length - 1].item.children : items).push(item);
      open.push({ indent, item });
    });
    items.forEach((it) => addItem(it, current(), ids, current() === root && !titledSections()));
    list = [];
  };
  const titledSections = () => stack.length > 1;
  const flushPara = () => {
    const text = clean(para.join(" "));
    para = [];
    if (!text) return;
    const node = current();
    if (node === root && !map.core) map.core = text.slice(0, 300);
    else if (!node.summary) node.summary = text.slice(0, 300);
    else push(node, "details", text.slice(0, 300));
  };
  const flush = () => { flushList(); flushPara(); };

  md.split(/\r?\n/).forEach((raw) => {
    if (/^\s*```/.test(raw)) { flush(); fenced = !fenced; return; }
    if (fenced) return;
    const h = raw.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (h) {
      flush();
      const level = h[1].length, label = h[2];
      if (level === 1 && !titled) { map.title = root.label = clean(label); titled = true; return; }
      skipping = SKIP_HEADINGS.test(clean(label));
      if (skipping) return;
      const lvl = Math.max(level, 2);
      while (stack.length > 1 && stack[stack.length - 1].level >= lvl) stack.pop();
      const node = newNode(label, ids);
      current().children.push(node);
      stack.push({ level: lvl, node });
      return;
    }
    if (skipping) return;
    const li = raw.match(/^(\s*)[-*+]\s+(.+)$/) || raw.match(/^(\s*)\d+[.)]\s+(.+)$/);
    if (li) { flushPara(); list.push({ indent: li[1].replace(/\t/g, "  ").length, text: li[2] }); return; }
    const quote = raw.match(/^>\s?(.*)$/);
    if (quote) { flush(); if (quote[1].trim()) push(current(), "quotes", clean(quote[1]).replace(/^"|"$/g, "")); return; }
    const link = raw.match(/^↔\s*(.+)$/);
    if (link) { flush(); map.links.push([current(), link[1].split(",").map((s) => s.trim())]); return; }
    if (!raw.trim() || /^(-{3,}|\*{3,}|\|)/.test(raw.trim())) { flush(); return; }
    const lens = lensOf(raw);
    if (lens) { flush(); current()[lens[0]] = lens[1]; return; }
    para.push(raw.trim());
  });
  flush();
  return map;
}

function resolveLinks(map) {
  const byLabel = {};
  const walk = (n) => { byLabel[n.label.toLowerCase()] = n.id; n.children.forEach(walk); };
  walk(map.root);
  map.links.forEach(([node, names]) => {
    const ids = names.map((s) => byLabel[s.toLowerCase()]).filter(Boolean);
    if (ids.length) node.connects = ids;
  });
}

function count(n) { return n.children.reduce((s, c) => s + 1 + count(c), 0); }

function importFile(file, outRoot) {
  const title = path.basename(file, path.extname(file));
  const map = parse(fs.readFileSync(file, "utf8"), title);
  resolveLinks(map);
  const slug = slugify(map.title);
  const dir = path.join(outRoot, slug);
  if (fs.existsSync(path.join(dir, "map-data.js"))) return `${slug}: skipped (map exists)`;
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(ASSETS, "template.html"), path.join(dir, "index.html"));
  ["viewer.js", "viewer-ui.js", "viewer-expand.js"].forEach((f) => fs.copyFileSync(path.join(ASSETS, f), path.join(dir, f)));
  const data = { slug, title: map.title, core: map.core, round: 0, working: null, agreed: { agent: false, user: false },
    root: map.root, log: [{ round: 0, focus: "Imported", learned: "From " + path.basename(file) }], merged: [] };
  fs.writeFileSync(path.join(dir, "map-data.js"), "window.MIND_MAP = " + JSON.stringify(data, null, 1) + ";\n", "utf8");
  // let mm.mjs compute statuses and write the exports, without changing which map is "current"
  const cur = path.join("mindmaps", ".current"), before = fs.existsSync(cur) ? fs.readFileSync(cur, "utf8") : null;
  execFileSync(process.execPath, [path.join(HERE, "mm.mjs"), "apply", dir], { input: "{}", stdio: ["pipe", "ignore", "inherit"] });
  if (before === null) fs.rmSync(cur, { force: true }); else fs.writeFileSync(cur, before, "utf8");
  return `${slug}: ${count(map.root)} nodes -> ${dir}`;
}

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outRoot = outIdx >= 0 ? args[outIdx + 1] : "mindmaps";
const target = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out")[0];
if (!target || !fs.existsSync(target)) fail("usage: import.mjs <file.md | folder> [--out mindmaps]");
const files = fs.statSync(target).isDirectory()
  ? fs.readdirSync(target, { recursive: true }).filter((f) => /\.md$/i.test(f)).map((f) => path.join(target, f))
  : [target];
if (!files.length) fail("no .md files in " + target);
files.forEach((f) => {
  try { console.log(importFile(f, outRoot)); } catch (e) { console.log(`${path.basename(f)}: failed (${e.message})`); }
});
