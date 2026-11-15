// File and process helpers shared by the hooks.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";

export const read = (file) => {
  try {
    return existsSync(file) ? readFileSync(file, "utf8") : null;
  } catch {
    return null;
  }
};

export const flagPath = (cwd) => join(cwd, ".work", "autopilot.json");

export function readFlag(cwd) {
  try {
    return JSON.parse(read(flagPath(cwd)) || "null");
  } catch {
    return null;
  }
}

export const writeFlag = (cwd, flag) => writeFileSync(flagPath(cwd), JSON.stringify(flag, null, 2));

export function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

// Tier from the optional budget pace script. No script installed: GREEN (no budget limits).
// Script present but unreadable: UNKNOWN, which stops autopilot rather than guessing.
export function currentTier() {
  const pace = join(homedir(), ".claude", "budget", "pace.mjs");
  if (!existsSync(pace)) return "GREEN";
  try {
    const out = execFileSync(process.execPath, [pace], { encoding: "utf8", timeout: 8000 });
    return /tier=(\w+)/.exec(out)?.[1] || "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

// Last assistant text, from the hook input or the transcript tail.
export function lastAssistantText(input) {
  if (typeof input.last_assistant_message === "string") return input.last_assistant_message;
  const lines = (read(input.transcript_path || "") || "").trim().split(/\r?\n/).reverse();
  for (const line of lines.slice(0, 200)) {
    try {
      const entry = JSON.parse(line);
      if (entry.type !== "assistant") continue;
      const text = (entry.message?.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      if (text) return text;
    } catch {
      /* skip partial line */
    }
  }
  return "";
}
