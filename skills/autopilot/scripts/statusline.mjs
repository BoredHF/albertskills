// Status line: the budget line from pace.mjs, with an autopilot badge in front while a run is on.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { readFlag, readStdin, read } from "./io.mjs";
import { nextPlanStep, ownership } from "./lib.mjs";

const input = readStdin();
const cwd = input.workspace?.current_dir || input.cwd || process.cwd();
let pace = "";
try {
  pace = execFileSync(process.execPath, [join(homedir(), ".claude", "budget", "pace.mjs"), "--statusline"], {
    encoding: "utf8",
    timeout: 5000,
    input: JSON.stringify(input),
  }).trim();
} catch {
  /* budget line is optional */
}

const flag = readFlag(cwd);
if (ownership(flag, input.session_id) === "own") {
  const spin = "◐◓◑◒"[Math.floor(Date.now() / 500) % 4];
  const next = nextPlanStep(read(join(cwd, ".work", "autopilot.md")));
  const label = flag.wrapping ? "wrapping up" : next ? next.slice(0, 40) : flag.mode;
  const badge = `\x1b[1;38;5;209m${spin} AUTOPILOT\x1b[0m \x1b[38;5;51m${flag.used || 0}/${flag.max}\x1b[0m \x1b[2m${label}\x1b[0m`;
  console.log(pace ? `${badge}  │  ${pace}` : badge);
} else {
  console.log(pace);
}
