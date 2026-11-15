---
name: autopilot
description: Hands-off mode where Claude prompts itself until a mission is done, then reports back. Asks one round of intake questions, scouts the project, writes a mission plan, and a Stop hook keeps re-prompting Claude step by step (with stuck detection, budget limits and a final report). Use when the user types /autopilot, says "autopilot", "go autopilot", "run on your own", "keep going without me", "do it yourself and get back to me", or wants Claude to stop needing prompts. Also "/autopilot off" or "status".
---

# /autopilot

The user says "autopilot", answers one question round, and walks away. You work until the mission is done, then report back. A Stop hook (`stop.mjs`) re-prompts you after every reply while `.work/autopilot.json` is on. Scripts live in `${CLAUDE_SKILL_DIR}/scripts/`.

## When not to use it
- The task is one small edit or one question: just do it.
- The goal can't be checked by a command you can run: ask the user to define "done" first.
- The user wants to review each step: work normally.

## Hard rules
- Never edit `~/.claude/settings.json` without an explicit yes (see First run).
- Never ask more than the one intake round before the final report, except to report a real blocker.
- Never check off a step you haven't verified by running something.
- Never run `git push`, delete files, add dependencies or change schemas/APIs when Check-ins is "Before anything risky".
- Keep state in `.work/` of the project, never elsewhere.

## `off` / `status`
Run `node ${CLAUDE_SKILL_DIR}/scripts/toggle.mjs off` (or `status`) in the project folder. Print the line it outputs. Stop.

## First run (once per machine)
Before starting, read `~/.claude/settings.json` and look for `autopilot` in its hooks.
- Stop hook (`stop.mjs`) and SessionStart hook (`brief.mjs`) are required. Without the Stop hook nothing re-prompts you.
- The statusLine entry (`statusline.mjs`) is optional: it only adds a badge. If the user already has a statusLine, skip it.
- If any required entry is missing, show the user the entries from `${CLAUDE_SKILL_DIR}/references/hooks.json` with every `SKILL_DIR` replaced by the absolute path `${CLAUDE_SKILL_DIR}`, and ask. Merge them only after a yes, keeping existing hooks. Tell the user to restart Claude Code so the hooks load, then stop. If the hook commands point at a folder that no longer exists (the skill moved or a plugin updated), repeat this step.
- If the user says no, say autopilot cannot loop without the Stop hook, and stop.

## Start (anything else)

1. **Scout quietly (5 cheap calls at most).** Use the `[project brief]` from session start if there is one. Otherwise check: `ls`, the README's first 40 lines, `.work/cards.md` and `state.md` if present, `git status --short | head`, and how tests and builds run (package.json scripts, gradle, cargo and so on). Don't read source files yet.

2. **Intake: one AskUserQuestion call, 3 questions.** Fit the options to what you found, best fit first, marked (Recommended):
   - **Mission**, e.g. "Finish my /work cards" (only if `cards.md` has open delegate or pair cards), "Get build + tests green", "Build a feature" (they type it in Other), "Clean up / polish". Skip this question if the user already stated the goal.
   - **Run length**: Quick (5 steps) · Normal (12) · Long (25).
   - **Check-ins**: "Only real decisions" (you pick sensible defaults and log them) · "Before anything risky" (deleting, deps, schema/API changes, git push).

3. **Write `.work/autopilot.md`.** For "Finish my /work cards", skip this and use mode `cards`.
   ```
   # Autopilot mission
   Goal: <one sentence>
   Done when: <a check you can run, e.g. `npm test` passes and `npm run build` exits 0>
   Check-ins: <their answer>
   ## Steps
   - [ ] <3-10 small, verifiable steps, in order>
   ## Log
   ## Report
   ```

4. **Engage.** Run `node ${CLAUDE_SKILL_DIR}/scripts/toggle.mjs on <cards|mission> <steps> <goal>`. Then go straight into step 1 in the same reply. Don't stop to confirm.

## Each step (the hook prompts you with `[autopilot step N/M]`)
- Do one step, verify it for real (run the test or build), check it off, and add one `## Log` line: `N · what changed · how verified`.
- If the `delegate` skill is installed, push each step down to a cheaper model through it. Send a small, self-contained step through the quick lane (one haiku agent). Send bulk work, or a step that splits into 2+ pieces, through waves. Keep inline only steps of 2 tool calls or fewer, and judgment calls. Check off a delegated step only after you've verified it. Without `delegate`, do the steps yourself.
- Found more work? Add steps. A step failing twice? Change approach or split it. The hook ends the run if you sit on one step for 3 rounds.
- Decide small things yourself and log them as `decided: …`. Respect the Check-ins rule.
- Need the user? End the reply with the question, which stops the loop, and add `blocked: <why>` to the Log.
- Keep replies to 2 to 4 lines while running. The work goes in files, not chat.
- Obey the `[pace]` tier if one is shown. At RED, the hook asks you to wrap up.

## Wrap up (the hook says "Stopping" or "Every step is checked")
1. If all steps are done, run the `Done when` check one last time. Fix failures before reporting.
2. Fill `## Report` in `.work/autopilot.md`: outcome (done / partial / stuck), files changed, decisions made, what's left or needs the user.
3. Send a PushNotification if the tool is available: `Autopilot done: <outcome in ~10 words>`.
4. Reply with the report in 5 lines or fewer, then `TL;DR: <outcome>`, and end with `[autopilot:done]`.

## Anti-patterns
- Re-asking intake questions after engaging.
- Writing steps like "improve code" that no command can verify.
- Checking off a step from memory or because the edit looked right.
- Long chat replies mid-run, or restating the plan each step.
- Doing a big step inline when `delegate` is available.
- Continuing past a failing `Done when` check to write a cheerful report.
- Leaving the flag on after finishing: run `toggle.mjs off` if the hook did not.
