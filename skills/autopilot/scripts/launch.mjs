// Opens the boot animation in its own window without blocking the caller.
// Opt-in (AUTOPILOT_POPUP=1): the autopilot-hud mod plays the animation inside Claude Code by default.
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function launchAnimation(goal = "") {
  if (!process.env.AUTOPILOT_POPUP || process.platform !== "win32") return false;
  const anim = join(dirname(fileURLToPath(import.meta.url)), "anim.mjs");
  try {
    const args = ["/c", "start", '"AUTOPILOT"', `"${process.execPath}"`, `"${anim}"`, `"${goal.replace(/"/g, "'")}"`];
    spawn("cmd.exe", args, { detached: true, stdio: "ignore", windowsVerbatimArguments: true }).unref();
    return true;
  } catch {
    return false;
  }
}
