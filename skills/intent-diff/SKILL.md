---
name: intent-diff
description: Compares what the user actually asked for with what you delivered, point by point, to catch drift, missed requirements and unrequested changes, then fixes or flags them. Use before declaring any multi-part task done, at the end of long sessions, after working from a pasted spec, or when the user says "did you do everything", "check against what I asked" or "intent diff".
---

# Intent Diff

Done means the request is met, not that the plan was finished. Diff the delivered work against the user's words, never against your own plan.

## Scale

- Single-ask task: skip.
- 2 to 4 asks: check silently and print the one-line clean form only, or the exceptions.
- Multi-part request, pasted spec or long session: full version.
- This checks that the work matches the request. Whether the work is good is `red-team`.

## Hard rules

1. Re-read every user message of the task verbatim, not your summary. Later messages amend earlier ones.
2. Quote the user's words for each requirement. Never paraphrase.
3. Evidence or it is not done. Open the file, run the thing, count the items. "I believe I did" is Partial at best.
4. Check numbers and literals literally. "3 options" means count three, "under 100 words" means count, names are spelled exactly.
5. Unrequested work is drift by default: refactors, renames, extra files, added features, reformatting, "while I was there".
6. A broken constraint ("don't touch X" and you touched X) is a Different requirement, not unrequested work. Undo it under Fixed now.
7. A requirement you chose not to meet is said out loud, never silently dropped.
8. Do not re-litigate the request. Do it as asked or flag it.

## Process

1. Re-read all user messages of the task.
2. Split into atomic requirements: explicit asks, constraints ("only", "don't", limits, formats, names), and at most 3 implied ones, marked `implied`.
3. For each, find evidence in the delivered work and set a status: Done, Partial, Missed or Different.
4. Reverse diff: list everything delivered that maps to no requirement. Mark each Keep (name the requirement it serves), Revert or Flag.
5. Fix now: finish Missed and Partial items. Correct Different items, or flag them with the reason. Revert unrequested work unless it is necessary for a requirement.
6. Report exceptions only. Do not print Done rows.

## Output format

```
INTENT DIFF: <n> requirements · <n> already done · <n> fixed now · <n> flagged

Fixed now:
- "<quote>" → was <missed|partial|different>; <what was done>

Flagged (your call):
- "<quote>" → <why it was not met or is Different, and the options>

Unrequested:
- <thing>: kept, serves "<quote>"
- <thing>: reverted
- <thing>: flagged, your call (<why it may be needed>)
```

Omit empty sections. If clean, print exactly one line:

```
Intent diff: 7/7 done, nothing unrequested.
```

## Anti-patterns

- Diffing against your plan instead of the request.
- Printing the whole table of Done rows.
- Marking Done from memory without opening the work.
- Calling extras "improvements".
- Flagging what you could simply fix.
- Treating the latest message as the whole request.
- Paraphrasing a requirement until it matches what you built.
- Reverting an unrequested change without checking that a requirement does not depend on it.
