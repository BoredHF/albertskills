#!/usr/bin/env node
// Prints a mind map's export as compact lines (finish line, doubts, buildable leaves), so Claude never reads the JSON.
// Input: mindmaps/<slug>/export/<slug>.json, written by the mind-map skill.
// Usage: node map2tasks.mjs [path/to/export.json | slug]
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MM_SCRIPT, requireMindMap } from "./need-mindmap.mjs";

export const SPECIAL = new Set(["finish", "doubts"]);

export function parseExport(text) {
  const map = JSON.parse(text);
  if (!map || !Array.isArray(map.nodes)) throw new Error("export JSON has no nodes[] array");
  return map;
}

// Walks up the parent chain once per node. Maps are small, so this stays cheap.
function ancestors(node, byId) {
  const chain = [];
  for (let p = node.parent; p && byId[p]; p = byId[p].parent) chain.push(byId[p]);
  return chain;
}

// Leaves are the buildable units. Skips unconfirmed suggestions (and anything under one),
// and the Finish/Doubts branches. `cut` comes from the node or its nearest ancestor.
export function collectLeaves(map) {
  const byId = Object.fromEntries(map.nodes.map((n) => [n.id, n]));
  return map.nodes.flatMap((node) => {
    if ((node.children || []).length > 0 || node.suggested) return [];
    const up = ancestors(node, byId);
    if (up.some((a) => a.suggested)) return [];
    const top = up.length ? up[up.length - 1] : node;
    if (SPECIAL.has(top.id)) return [];
    const cut = node.cut || (up.find((a) => a.cut) || {}).cut || null;
    return [{ node, cut }];
  });
}

export function formatLeaf({ node, cut }) {
  const open = (node.open || []).length;
  const parts = [node.id, node.path || node.label, node.summary || "-", `status:${node.status || "empty"}`];
  if (cut) parts.push(`cut:${cut}`);
  if (open) parts.push(`open:${open}`);
  if ((node.connects || []).length) parts.push(`links:${node.connects.join(",")}`);
  return parts.join(" | ");
}

// The Finish and Doubts branches are planning context, not tasks.
export function specialLines(map) {
  const confirmed = (parent) => map.nodes.filter((n) => n.parent === parent && !n.suggested);
  return [
    ...confirmed("finish").map((n) => `# finish/${n.id}: ${n.label} — ${n.summary || "-"}`),
    ...confirmed("doubts").map((n) => `# doubt/${n.id}: ${n.label} — ${n.summary || "(no answer yet)"}`),
  ];
}

export function headerLines(map, leafCount) {
  const agreed = map.agreed && map.agreed.agent && map.agreed.user;
  return [
    `# ${map.title} — ${map.core}`,
    agreed ? "# map: agreed complete" : "# map: NOT agreed complete yet (warn the user once, plan anyway if they say so)",
    `# ${leafCount} leaves (id | path | summary | status | cut | open | links)`,
  ];
}

export function resolvePath(arg, cwd = process.cwd()) {
  if (arg && arg.endsWith(".json")) return arg;
  const base = join(cwd, "mindmaps");
  if (arg) return join(base, arg, "export", `${arg}.json`);
  if (!existsSync(base)) throw new Error("No mindmaps/ folder here. Pass a path to export/<slug>.json.");
  const slugs = readdirSync(base).filter((s) => existsSync(join(base, s, "export", `${s}.json`)));
  if (slugs.length !== 1) throw new Error(`Found ${slugs.length} exported maps (${slugs.join(", ")}). Pass a slug.`);
  return join(base, slugs[0], "export", `${slugs[0]}.json`);
}

function main() {
  requireMindMap();
  const file = resolvePath(process.argv[2]);
  if (!existsSync(file)) throw new Error(`${file} not found. Run: node ${MM_SCRIPT} export mindmaps/<slug>`);
  const map = parseExport(readFileSync(file, "utf8"));
  const leaves = collectLeaves(map);
  [...headerLines(map, leaves.length), ...specialLines(map), ...leaves.map(formatLeaf)].forEach((l) => console.log(l));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (err) {
    console.error(`map2tasks: ${err.message}`);
    process.exit(1);
  }
}
