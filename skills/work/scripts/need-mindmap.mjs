// Fails with a one-line message when the mind-map skill is not installed.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const MM_SCRIPT = join(homedir(), ".claude", "skills", "mind-map", "scripts", "mm.mjs");

export function requireMindMap() {
  if (!existsSync(MM_SCRIPT)) {
    throw new Error(`the mind-map skill is not installed (missing ${MM_SCRIPT}). Copy skills/mind-map to ~/.claude/skills/mind-map.`);
  }
}
