// Usage: node toggle.mjs on [cards|mission] [maxSteps] [goal...] | off | status   (run in the project folder)
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_MAX } from "./lib.mjs";
import { readFlag, writeFlag } from "./io.mjs";
import { launchAnimation } from "./launch.mjs";

const cwd = process.cwd();
const [cmd = "status", ...rest] = process.argv.slice(2);
const flag = readFlag(cwd) || { on: false, used: 0, max: DEFAULT_MAX };

if (cmd === "on") {
  const explicit = ["cards", "mission"].includes(rest[0]) ? rest.shift() : null;
  const max = Number(rest[0]) > 0 ? Number(rest.shift()) : DEFAULT_MAX;
  const goal = rest.join(" ").trim();
  const mode = explicit || (goal ? "mission" : "cards");
  mkdirSync(join(cwd, ".work"), { recursive: true });
  const session = process.env.CLAUDE_CODE_SESSION_ID || null; // null: the first Stop hook claims it
  writeFlag(cwd, { on: true, mode, used: 0, max, goal, session, startedAt: new Date().toISOString() });
  launchAnimation(goal);
  console.log(`autopilot ON · ${mode} · max ${max} self-prompts${goal ? ` · goal: ${goal}` : ""}`);
} else if (cmd === "off") {
  writeFlag(cwd, { ...flag, on: false, stopped: "user" });
  console.log("autopilot OFF");
} else {
  const why = flag.stopped ? ` · last stop: ${flag.stopped}` : "";
  console.log(`autopilot ${flag.on ? "ON" : "OFF"} · ${flag.used || 0}/${flag.max || DEFAULT_MAX} steps${flag.goal ? ` · goal: ${flag.goal}` : ""}${why}`);
}
