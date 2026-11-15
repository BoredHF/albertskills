#!/usr/bin/env node
// Decides what /work should do right now, so the user never has to pick a sub-command.
// Prints one line: `action: <plan|continue|next|ship|done|shelved|no-map> | ...`
// Usage: node where.mjs [projectDir]
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCards, progressLine } from "./ratio.mjs";
import { MM_SCRIPT, requireMindMap } from "./need-mindmap.mjs";

const read = (file) => (existsSync(file) ? readFileSync(file, "utf8") : null);

// Maps export to <dir>/mindmaps/<slug>/export/<slug>.json. Check the project, then up to 3 parent folders.
// A map folder without an export comes back as its map-data.js, so the caller can regenerate the export.
export function findMaps(start) {
  let dir = start;
  for (let depth = 0; depth < 4; depth++) {
    const base = join(dir, "mindmaps");
    if (existsSync(base)) {
      const maps = readdirSync(base)
        .map((slug) => [join(base, slug, "export", `${slug}.json`), join(base, slug, "map-data.js")])
        .map(([json, js]) => (existsSync(json) ? json : existsSync(js) ? js : null))
        .filter(Boolean)
        .map((file) => ({ file, mtime: statSync(file).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      if (maps.length) return maps.map((m) => m.file);
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return [];
}

export function decide({ cards, state, learn, maps }) {
  if (state && /^tldr: SHELVED/m.test(state)) return "action: shelved | ask: resume it, or start something else?";
  if (cards === null) {
    if (maps.length === 0) return "action: no-map | say: no mind map found, run /mind-map first";
    const note = maps.length > 1 ? ` | note: newest of ${maps.length} maps, others: ${maps.slice(1).join(", ")}` : "";
    if (maps[0].endsWith("map-data.js")) {
      return `action: export | map: ${dirname(maps[0])} | run: node ${MM_SCRIPT} export ${dirname(maps[0])} then re-run where${note}`;
    }
    return `action: plan | map: ${maps[0]}${note}`;
  }
  const list = parseCards(cards);
  const progress = progressLine(list);
  const doing = list.find((c) => c.doing);
  if (doing) return `action: continue | card: ${doing.id} ${doing.mode} | ${progress}`;
  const shipped = Boolean(learn && /^## Shipped v1/m.test(learn));
  const openV1 = list.some((c) => c.cut === "v1" && !c.done);
  if (!openV1 && !shipped && list.some((c) => c.cut === "v1")) return `action: ship | ${progress}`;
  if (list.some((c) => !c.done)) return `action: next | ${progress}`;
  return `action: done | ${progress} | ask: polish more, plan a new map, or call it finished?`;
}

function main() {
  requireMindMap();
  const project = process.argv[2] || process.cwd();
  const work = join(project, ".work");
  const maps = findMaps(project).map((file) => relative(project, file) || file);
  console.log(decide({
    cards: read(join(work, "cards.md")),
    state: read(join(work, "state.md")),
    learn: read(join(work, "learn.md")),
    maps,
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (err) {
    console.error(`where: ${err.message}`);
    process.exit(1);
  }
}
