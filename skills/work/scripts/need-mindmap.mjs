// Fails with a one-line message when the mind-map skill is not installed.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const MM_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "mind-map", "scripts", "mm.mjs");

export function requireMindMap() {
  if (!existsSync(MM_SCRIPT)) {
    throw new Error(`the mind-map skill is not installed (missing ${MM_SCRIPT}). Install the mind-map skill from the same pack, next to this one.`);
  }
}
