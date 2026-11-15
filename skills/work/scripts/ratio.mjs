#!/usr/bin/env node
// Progress, human/AI split, per-card cost and parked doubts from .work/, computed so Claude spends no tokens counting.
// Usage: node ratio.mjs [cards.md] [--plan]   (--plan measures the split over every card, not only done ones)
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const TARGET_HUMAN = 0.3;
const SIZE = { S: 1, M: 2, L: 3 };
const HUMAN_SHARE = { drive: 1, pair: 0.5, delegate: 0 };
const CARD = /^- \[( |~|x)\] (\S+) \| (drive|pair|delegate) \| ([SML]) \| (v1|later|polish) \|/;
const USED = /\| used:(\d+(?:\.\d+)?)%/;

export function parseCards(text) {
  return text.split(/\r?\n/).flatMap((line) => {
    const m = CARD.exec(line);
    if (!m) return [];
    const used = USED.exec(line);
    const [, mark, id, mode, size, cut] = m;
    return [{ id, mode, size, cut, done: mark === "x", doing: mark === "~", used: used ? Number(used[1]) : null }];
  });
}

export function humanShare(cards) {
  const total = cards.reduce((sum, c) => sum + SIZE[c.size], 0);
  if (total === 0) return null;
  const human = cards.reduce((sum, c) => sum + SIZE[c.size] * HUMAN_SHARE[c.mode], 0);
  return human / total;
}

export function bar(done, total, width = 10) {
  const filled = total === 0 ? 0 : Math.round((done / total) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function progressLine(cards) {
  const v1 = cards.filter((c) => c.cut === "v1");
  const v1Done = v1.filter((c) => c.done).length;
  const count = (cut) => cards.filter((c) => c.cut === cut && !c.done).length;
  const shipped = v1.length > 0 && v1Done === v1.length ? " · v1 READY TO SHIP: /work ship" : "";
  return `v1: ${bar(v1Done, v1.length)} ${v1Done}/${v1.length} · later ${count("later")} · polish ${count("polish")}${shipped}`;
}

export function ratioLine(cards, plan) {
  const counted = plan ? cards : cards.filter((c) => c.done);
  const share = humanShare(counted);
  const scope = plan ? "planned" : "done";
  if (share === null) return `ratio: no ${scope} cards yet`;
  const pct = Math.round(share * 100);
  const gap = pct - TARGET_HUMAN * 100;
  const hint = Math.abs(gap) <= 5 ? "on target" : gap < 0 ? "you're under: flip a card to drive/pair" : "you're over: delegate more";
  return `ratio (${scope}): you ${pct}% / AI ${100 - pct}% · target 30/70 · ${hint}`;
}

export function costLine(cards) {
  const measured = cards.filter((c) => c.used !== null);
  if (measured.length === 0) return "cost: no measured cards yet";
  const avg = (list) => (list.reduce((s, c) => s + c.used, 0) / list.length).toFixed(1);
  const parts = ["delegate", "pair", "drive"]
    .map((mode) => [mode, measured.filter((c) => c.mode === mode)])
    .filter(([, list]) => list.length > 0)
    .map(([mode, list]) => `${mode} ${avg(list)}%`);
  return `cost per card (session %): ${parts.join(" · ")} · n=${measured.length}`;
}

export function countDoubts(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.startsWith("- "));
  const parked = lines.filter((l) => l.includes("| parked")).length;
  return `doubts: ${parked} parked · ${lines.length - parked} answered`;
}

export function report(cards, plan, doubtsText = null) {
  const lines = [progressLine(cards), ratioLine(cards, plan), costLine(cards)];
  if (doubtsText !== null) lines.push(countDoubts(doubtsText));
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--")) || ".work/cards.md";
  if (!existsSync(file)) throw new Error(`${file} not found. Run /work plan first.`);
  const doubtsFile = join(dirname(file), "doubts.md");
  const doubts = existsSync(doubtsFile) ? readFileSync(doubtsFile, "utf8") : null;
  console.log(report(parseCards(readFileSync(file, "utf8")), args.includes("--plan"), doubts));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (err) {
    console.error(`ratio: ${err.message}`);
    process.exit(1);
  }
}
