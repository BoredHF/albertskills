---
name: delegate
description: Hand work to subagents properly. Decides whether delegating pays off, splits the job into tasks that each have a check you can run, routes each task to the cheapest model that can do it (haiku, sonnet, rarely opus), runs independent tasks in parallel waves without file clashes, writes tight briefs, then verifies every result itself before accepting it. Use when the user says /delegate, "delegate this", "hand this off", "use subagents", "split this up", "farm this out", "do these in parallel", when an autopilot step is bulk or splits into 2+ independent pieces, or when a job would flood the main context (sweeping many files, mass edits, many similar changes).
---

# /delegate

Subagents are cheap hands, not trusted judges. You keep the thinking: the split, the briefs and the verification. They do the typing. A delegation is only done when **you** have checked the result.

Scripts: `node ${CLAUDE_SKILL_DIR}/scripts/waves.mjs [.work/delegate.json] [--tier <tier>]`. Agents: `delegate-worker` (writes code), `Explore` (read-only search).

## Hard rules
- Never accept a worker's "pass" without running its DONE check yourself.
- Never put two writers on overlapping paths in one wave.
- Never invent a result that has not come back.
- Max 2 retries per task, then inline.
- Do not delegate inline-lane work, design calls, or decisions the user must make.

## 0. First run
If `~/.claude/agents/delegate-worker.md` is missing, copy it from `${CLAUDE_SKILL_DIR}/agents/delegate-worker.md` (create `~/.claude/agents/` if needed). Without it, spawn a `general-purpose` agent with the same brief and the same report format; everything else is unchanged. Needs Node 18+ for `waves.mjs`.

## 1. Gate: which lane?
The main thread is the most expensive model in the room. Every file it reads and every log it sees costs top price. So the default is to push work down to a cheaper model, small things included.

| Lane | When | How |
|---|---|---|
| **Inline** | 2 tool calls or fewer (a one-line fix, a single known edit) · needs conversation context that's hard to write down · a design or judgment call · the user has to decide | Do it yourself |
| **Quick** | One self-contained task: a small feature or fix, a lookup, a test to write, a log to read, a config change | Section 1a: one haiku agent with a short brief, no plan file |
| **Waves** | 2+ tasks, bulk work, or anything M/L | Sections 2 to 7 |

When unsure between inline and quick: if doing it yourself means reading more than about 2 files or running a command with long output, use **quick**.

## 1a. Quick lane
1. Spawn one agent:
   - lookups and questions: `subagent_type: Explore`, `model: haiku`
   - edits: `delegate-worker` with `model: haiku`. Use `sonnet` only when haiku would need judgment, like tricky logic or a subtle bug.
2. Use the short brief, 4 lines:
   ```
   GOAL: <one sentence>
   FILES: <paths, with line ranges if you know them>
   DONE: <the check command, or the exact answer format for a lookup>
   OUT OF SCOPE: <the one tempting thing not to touch>
   ```
   Add a CONTEXT line only for facts it can't find in 1 grep.
3. Verify, cheaply but for real:
   - edits: run DONE yourself and `git diff --stat`, then read only the hunks.
   - lookups: spot-check one claimed `file:line`.
4. If it fails: one SendMessage retry with the failure output, then sonnet, then inline. No ledger line needed for the quick lane.

Budget (optional): if your setup reports a budget tier, RED or OUT means no delegation and AMBER means no opus (the planner handles that if you pass `--tier`). With no tier, assume GREEN.

## 2. Split into tasks
Write `.work/delegate.json`:
```json
{ "tasks": [
  { "id": "T1", "title": "Add retry to fetchJson", "size": "S|M|L", "kind": "mechanical|code|research|design",
    "files": ["src/net/fetch.ts", "test/net/fetch.test.ts"], "deps": [], "done": "npm test -- fetch", "hard": false }
] }
```
- **One outcome per task.** If its title needs "and", split it.
- **`files` is a promise.** List every path it may write (folders are OK). A writer with no files runs alone, so name them.
- **`done` must be checkable by you**: a command (`npm test -- fetch`, `cargo build`) or an exact observable result. "Works" is not a check.
- `kind`:
  - `research` is read-only and goes to Explore.
  - `design` stays inline: do it first, and its result goes into the dependent briefs.
  - Mark `hard: true` only for gnarly L code where sonnet would struggle.
- 2 to 8 tasks is the sweet spot. More than that and the briefing costs eat the savings.

## 3. Plan
Run `waves.mjs --tier <tier>`. It validates the tasks, routes each to a model and agent, and orders them into waves: dependencies first, at most 4 per wave, and never two writers on overlapping paths in the same wave. If it says `NOT READY`, fix the tasks; don't work around it. Show the user the plan in 6 lines or fewer. Under autopilot, just log it.

## 4. Brief: the part that decides quality
The worker knows nothing but your brief. Write each one like this:
```
GOAL: <the outcome, one sentence>
CONTEXT: <the facts it needs: paths with line ranges, exact error text, the conventions to follow, the existing helper to reuse, what you already ruled out>
FILES: <the task's files list; touch only these>
CONSTRAINTS: <no new deps, keep the public API, style rules, platform>
DONE: <the exact check command and what passing looks like>
OUT OF SCOPE: <the tempting nearby things it must not do>
```
- Give it **facts, not your hunches as facts**. If you suspect a cause, label it "hypothesis:" so it checks instead of confirming.
- Paste the exact snippet or signature it has to match, so it doesn't spend a read finding it.
- Results from earlier waves (research output, design decisions) go into CONTEXT. Don't make a worker rediscover them.

## 5. Dispatch
Send each wave as **one message with one Agent call per task**, so they run in parallel. Use `subagent_type` and `model` from the plan. Wait for the whole wave before starting the next one. Never predict or invent a result that hasn't come back yet.

## 6. Verify: never skip this
For every report, before you accept it:
1. **Run its DONE check yourself.** The worker's "pass" is a claim, not evidence.
2. **Read the diff.** Run `git diff --stat`, then skim the changed hunks. Watch for stubs, deleted tests, weakened assertions, swallowed errors, hardcoded test values, and files outside its scope.
3. **Check `outside-scope` and `followups`.** Decide whether to keep those changes, and which follow-ups become new tasks.

Then:
- **Accept** if it passes and the diff is clean.
- **Retry once** if it failed: SendMessage the **same agent** (it keeps its context) with the exact failure output and what to change.
- **Escalate** if the retry also fails: try once more with a stronger model (haiku → sonnet), or do it inline. Never more than 2 retries per task.
- **Blocked**: fix the brief, or bring the decision back to the user.

## 7. Close
- After the last wave, run the **whole** project check once (full test suite or build). Tasks that each pass can still break together.
- Append one line per task to `.work/delegate.md`: `date | id | model | accepted / retried / escalated / inline | check result`. Over time this shows which kinds of task each model handles well, so route by it.
- Reply in 5 lines or fewer: what was done, what was verified and how, anything you rejected or did inline, and what's left. End with `TL;DR:`.

## Anti-patterns
- Briefing with "fix the bug" and no files, error text or check.
- Stating a hunch as a fact in CONTEXT.
- Splitting a 2-call job into waves, or running one giant task as a single worker.
- Reviewing only the worker's summary, not the diff.
- Omitting `files`, so the planner serializes everything.

## With autopilot and /work
- **Autopilot:** a whole delegation counts as one autopilot step. Check it off only after step 7 passes.
- **/work cards:** keep using the `delegate` agent with the card itself as the brief. Use this skill when a card is big enough to split.
