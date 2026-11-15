---
name: failure-museum
description: Keeps a project file of every mistake Claude made (what happened, root cause, the rule that prevents it), read at the start of work and checked before finishing. Use at the start and end of any non-trivial task in a project that has `.claude/failure-museum.md`, whenever the user corrects Claude or work must be redone, and on "remember this mistake", "don't do that again", "add it to the museum", "what have you got wrong before".
---

# Failure Museum

A mistake logged as a checkable rule is made once; a mistake merely apologised for is made again.

Location: `.claude/failure-museum.md` in the project root. If `~/.claude/failure-museum.md` exists, read it too, but only ever write to the project file. Works for any work: code, writing, design, research, plans.

## Scale

- Trivial tasks (a question, a one-line edit): do not open the museum.
- Check only exhibits whose "Applies when" matches the task, never the whole file.
- No file yet: create nothing until the first real mistake.

## What counts as an exhibit

- The user corrects or rejects the work, or it must be redone.
- A test, build or check fails because of Claude's own avoidable error.
- An earlier claim turns out wrong.
- The same error happens twice in one session.

Not exhibits: the user changing their mind, an outside outage, a planned experiment that failed informatively, user preferences (those belong in memory or CLAUDE.md).

## Process

**Open** (start of work)
1. Read the file. Select exhibits whose "Applies when" matches the task.
2. State them in one line. If none match, say nothing.

**Admit** (the moment a mistake is confirmed)
3. Fix the mistake first.
4. Search the file for the same root cause. Update that exhibit, or add a new one from the template.
5. Write it in one edit, tell the user in one line, carry on.

**Check** (before saying done)
6. Run each applicable exhibit's Check. Print one line.
7. Fix any fail before delivering and print it as `fail, fixed`. A fail caught here is not a new exhibit, but if the user already saw that mistake, it is a repeat (rule 4). If none applied, print nothing.

## Hard rules

1. Root cause is about Claude's process, not the artefact. "Off-by-one in the loop" is the symptom; "wrote the loop without testing the boundary" is the cause. Keep asking "what did I do or skip that let this through?" until the answer is an action Claude controls.
2. The rule is checkable and scoped: an "Applies when" so it fires only on relevant work, and a "Check" answerable yes/no or by a command. "Be more careful", "double-check", "verify thoroughly" are banned.
3. Log at the moment, never later. No apology paragraphs, no asking permission to log.
4. Repeats escalate. If an exhibit's mistake happens again, the rule failed: increment Repeats and rewrite the rule and Check so they would have caught this case. At Repeats 2, propose moving the rule into CLAUDE.md, which is always loaded.
5. No duplicates: same root cause means same exhibit, updated.
6. Cap at 30 exhibits. When over, merge exhibits that share a root cause into one sharper rule, and move exhibits whose cause no longer exists to a one-line `## Retired` list.
7. Never record secrets or personal data, and never record the user as the cause.
8. Write "pass" only after actually running the Check.

## First-time setup

When the file is first created, ask once whether to add this line to the project's CLAUDE.md, because that is what makes the museum load without being asked:

> Read `.claude/failure-museum.md` before starting work and run its matching checks before finishing (skill: failure-museum).

## Templates

File header:

```markdown
# Failure Museum
Mistakes Claude has made in this project, each with a rule and a check that prevent a repeat.
Next ID: E01
```

Exhibit (increment `Next ID` after adding):

```markdown
## E07 · Edited generated dist/api.ts by hand; the next build wiped it
Date: 2026-03-02 · Repeats: 0
What happened: Hand-fixed dist/api.ts; the change vanished on the next build.
Root cause: Did not check whether the file was generated before editing it.
Rule: Before editing a file, check for a generated-file header or a build step that writes it.
Applies when: Editing anything under dist/, build/, gen/ or a file marked DO NOT EDIT.
Check: `git check-ignore <file>` and read the first 5 lines; edit the source instead if either shows it is generated.
```

Non-code pair, to show the level required:
- Root cause: "Quoted a statistic from a search snippet without opening the source." Rule: "Open the cited page and find the figure before quoting it." Applies when: citing any number in writing.

## Output format

Only these one-liners are printed; nothing else about the museum.
- Open: `Museum: matches E03, E07.`
- Admit: `Museum: added E07.` (or `Museum: updated E07, Repeats 1.`)
- Check: `Museum check: E03 pass, E07 fail, fixed.`

## Anti-patterns

- Exhibits that describe the bug rather than the behaviour that allowed it.
- Vague rules with no Applies when or runnable Check.
- Reciting the whole museum at the start.
- Contrition essays.
- Logging preferences as mistakes.
- Batch-writing exhibits from memory at session end; that is `autopsy`'s job, and it writes its lessons here as exhibits.
- Claiming a check passed without running it.

A `stuck-detector` loop caused by Claude's own error becomes an exhibit. For catching mistakes before they happen, use `premortem` or `red-team`; this skill only records and enforces what already went wrong.
