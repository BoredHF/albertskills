// Stop hook: when autopilot is on for this project, re-prompt Claude with the next AI-owned step.
import { join } from "node:path";
import { homedir } from "node:os";
import { appendFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { decide, ownership } from "./lib.mjs";
import { read, readFlag, writeFlag, readStdin, currentTier, lastAssistantText } from "./io.mjs";

// One line per Stop event, so a run that halted can be explained afterwards. Capped at ~200 KB.
const STATE_DIR = join(homedir(), ".claude", "autopilot");
const LOG = join(STATE_DIR, "stop.log");
function log(entry) {
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    if ((statSync(LOG, { throwIfNoEntry: false })?.size || 0) > 200_000) writeFileSync(LOG, "");
    appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
  } catch {
    /* logging must never break the hook */
  }
}

function main() {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const flag = readFlag(cwd);
  const owner = ownership(flag, input.session_id);
  log({ session: input.session_id, cwd, on: Boolean(flag?.on), owner, active: input.stop_hook_active });
  if (owner === "off" || owner === "other") return; // another session's run never drives this one
  if (owner === "claim") flag.session = input.session_id;

  const result = decide({
    flag,
    tier: currentTier(),
    lastMessage: lastAssistantText(input),
    cardsText: read(join(cwd, ".work", "cards.md")),
    state: read(join(cwd, ".work", "state.md")),
    planText: read(join(cwd, ".work", "autopilot.md")),
  });

  log({ session: input.session_id, block: result.block, why: result.why || null });
  if (!result.block) {
    if (!result.turnOff) return;
    writeFlag(cwd, { ...flag, on: false, wrapping: false, stopped: result.why });
    console.log(JSON.stringify({ systemMessage: `autopilot finished: ${result.why} · report in .work/autopilot.md` }));
    return;
  }
  writeFlag(cwd, { ...flag, ...result.patch, used: (flag.used || 0) + 1 });
  console.log(JSON.stringify({ decision: "block", reason: result.reason }));
}

try {
  main();
} catch {
  /* never trap the user in a broken loop */
}
