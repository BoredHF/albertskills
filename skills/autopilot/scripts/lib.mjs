// Pure decision logic for autopilot. No I/O here, so it is easy to test.
import { parseCards } from "./cards.mjs";

export const DEFAULT_MAX = 8;
const NEEDS_USER = /(\?\s*$)|\/\/ YOU:|your turn|over to you|need(s)? (you|your input)|\[blocked\]/i;
const DONE_MARK = /\[autopilot:done\]/i;

// Which session a run belongs to: "own" (this one), "claim" (unstamped, take it), or "other".
export function ownership(flag, sessionId) {
  if (!flag || !flag.on) return "off";
  if (!flag.session) return sessionId ? "claim" : "own";
  return !sessionId || flag.session === sessionId ? "own" : "other";
}

// Which card /work would pick next: the in-progress one, else the first open v1 card.
export function pickCard(cards) {
  return cards.find((c) => c.doing) || cards.find((c) => !c.done && c.cut === "v1") || null;
}

function titleOf(cardsText, id) {
  const line = cardsText.split(/\r?\n/).find((l) => l.includes(`] ${id} `));
  return line ? line.split("|")[4]?.trim() || "" : "";
}

// Returns { block: false, why } to let Claude stop, or { block: true, reason } to keep it going.
// `patch` is merged into the flag file by the caller; `turnOff` ends the run.
export function decide({ flag, tier, lastMessage, cardsText, state, planText }) {
  if (!flag || !flag.on) return { block: false, why: "off" };
  const msg = (lastMessage || "").trim();
  if (DONE_MARK.test(msg)) return { block: false, why: "goal done", turnOff: true };
  if (flag.wrapping) return { block: false, why: flag.wrapping, turnOff: true };

  const stopReason = !["GREEN", "AMBER"].includes(tier) ? `budget tier ${tier}`
    : (flag.used || 0) >= (flag.max || DEFAULT_MAX) ? "step cap reached" : null;
  if (stopReason) return wrapUp(stopReason);
  if (NEEDS_USER.test(msg)) return { block: false, why: "needs the user" };
  if (state && /^blocked:[ \t]*(?!-[ \t]*$)\S/m.test(state)) return { block: false, why: "state.md says blocked" };

  const step = `step ${(flag.used || 0) + 1}/${flag.max || DEFAULT_MAX}`;
  if (flag.mode === "cards" || (!flag.goal && !planText && cardsText)) return cardsStep(cardsText, step);
  return missionStep(flag, planText, step);
}

// One last self-prompt so Claude always reports back, even when the run is cut short.
function wrapUp(why) {
  return {
    block: true,
    patch: { wrapping: why },
    reason: `[autopilot] Stopping: ${why}. Do not start new work. Update .work/autopilot.md (check finished steps), write the report section, send the push notification, and end with [autopilot:done].`,
  };
}

function cardsStep(cardsText, step) {
  if (!cardsText) return { block: false, why: "no .work/cards.md", turnOff: true };
  const card = pickCard(parseCards(cardsText));
  if (!card) return wrapUp("no open v1 cards left");
  if (card.mode === "drive") return wrapUp(`${card.id} is a drive card (yours to code)`);
  if (card.mode === "pair" && card.doing) return wrapUp(`${card.id} skeleton is waiting for you`);
  const title = titleOf(cardsText, card.id);
  return {
    block: true,
    reason:
      `[autopilot ${step}] Keep going without the user. Run /work on ${card.id} (${card.mode} ${card.size}: ${title}). ` +
      `Follow state.md's next: line, verify (tests/build), then review+wrap the card and update state.md. ` +
      `Ask only if a decision is genuinely the user's.`,
  };
}

export function nextPlanStep(planText) {
  const line = (planText || "").split(/\r?\n/).find((l) => /^\s*- \[ \] /.test(l));
  return line ? line.replace(/^\s*- \[ \] /, "").trim() : null;
}

function missionStep(flag, planText, step) {
  if (!flag.goal && !planText) return { block: false, why: "no mission", turnOff: true };
  const next = nextPlanStep(planText);
  if (planText && !next) {
    return {
      block: true,
      patch: { wrapping: "all steps checked" },
      reason: `[autopilot] Every step in .work/autopilot.md is checked. Verify the "Done when" line for real (run it), fix anything that fails, then write the report, send the push notification, and end with [autopilot:done].`,
    };
  }
  const repeat = next && next === flag.lastStep ? (flag.repeat || 0) + 1 : 0;
  if (repeat >= 3) return wrapUp(`stuck on "${next}" for 3 rounds`);
  const target = next ? `the next step: "${next}"` : `the goal: "${flag.goal}"`;
  return {
    block: true,
    patch: { lastStep: next, repeat },
    reason:
      `[autopilot ${step}] Keep going without the user. Do ${target} (see .work/autopilot.md). Verify it, check it off, ` +
      `add any new steps you discover, log one line under Log. If the approach is failing, change approach rather than retrying. ` +
      `Ask only if a decision is genuinely the user's.`,
  };
}

// Compact project brief injected at session start, so Claude knows the project without being told.
export function brief({ cardsText, state, flag, planText, sessionId }) {
  const lines = ["[project brief]"];
  if (cardsText) {
    const head = cardsText.split(/\r?\n/).filter((l) => /^(why|v1):/.test(l));
    lines.push(...head);
    const cards = parseCards(cardsText);
    const open = cards.filter((c) => !c.done && c.cut === "v1").map((c) => `${c.id}(${c.mode}${c.doing ? ",doing" : ""})`);
    lines.push(`v1 cards: ${cards.filter((c) => c.done && c.cut === "v1").length} done, open: ${open.join(" ") || "none"}`);
  }
  if (state) lines.push(...state.trim().split(/\r?\n/).map((l) => `state ${l}`));
  const owner = ownership(flag, sessionId);
  if (owner === "other") {
    lines.push(`autopilot: a run from another session is on here (${flag.goal || flag.mode}). It is NOT active in this session: don't continue it unless the user asks; /autopilot off clears it.`);
  }
  const next = nextPlanStep(planText);
  if (owner === "own" && next) lines.push(`autopilot next step: ${next} (plan: .work/autopilot.md)`);
  if (owner === "own") {
    lines.push(`autopilot ON (${flag.used || 0}/${flag.max || DEFAULT_MAX} steps)${flag.goal ? ` goal: ${flag.goal}` : ""}: keep going on AI-owned work; don't wait for the user.`);
  }
  return lines.length > 1 ? lines.join("\n") : "";
}
