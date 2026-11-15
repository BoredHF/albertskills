// SessionStart hook: inject a compact brief of the project's /work state (also after compaction).
import { join } from "node:path";
import { brief } from "./lib.mjs";
import { read, readFlag, readStdin } from "./io.mjs";

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const text = brief({
    cardsText: read(join(cwd, ".work", "cards.md")),
    state: read(join(cwd, ".work", "state.md")),
    flag: readFlag(cwd),
    planText: read(join(cwd, ".work", "autopilot.md")),
    sessionId: input.session_id,
  });
  if (text) console.log(text);
} catch {
  /* a missing brief must never block a session */
}
