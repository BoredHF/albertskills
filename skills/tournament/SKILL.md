---
name: tournament
description: Writes 3–5 genuinely different versions of an important output, scores them blind against a rubric built for the task, and merges the strongest parts into one final version. Use for high-stakes outputs where the first idea is rarely the best (a headline, landing copy, an API or architecture, an opening paragraph, a strategy, a name), or when the user says "tournament", "give me your best", "make this excellent", "try a few approaches" or "don't just give me the first thing".
---

# Tournament

The first version is the most probable one, which makes it the most average one. A tournament forces out versions that would never be written first, then lets a rubric choose instead of attachment.

## Scale

| Task | Do |
|---|---|
| One right answer, a factual question, a small edit, a bug fix | Skip, silently, unless the user explicitly asked for a tournament: then run a sketch round. |
| Medium stakes, or a big output (a codebase, a long document) | **Sketch round**: 3 versions of the decisive part only (the outline, the signature, the opening, the architecture in 5 lines). Score, then build the winner once. No merge. |
| High stakes and short enough to write several times (under ~400 words or ~80 lines) | **Full round**: 4–5 complete versions. |

Never write a large output five times. Find the part where the approach gets decided and run the tournament there.

## Hard rules

1. **Rubric before versions.** Write it before any version exists and do not edit it afterwards. A rubric written later describes the version you already like.
2. **Different bets, not different wording.** Each version starts from a one-line bet about what matters most. If the difference between two versions can be described as an edit ("shorter", "more formal", "adds an example"), they are one version. Replace one.
3. **One version must be uncomfortable**: the one you would not normally write (the opposite structure, a third of the length, the thing this genre never does).
4. **Score by criterion, not by version.** Go across: every version on criterion 1, then every version on criterion 2. No totals until every cell is filled.
5. **Scores cite evidence**: a quoted phrase, a line, a concrete case. Mandatory for every 1, every 5 and any cell that decides the winner; other cells may be bare numbers. A decisive score without evidence is a preference.
6. **The merge has to win too.** Score the merged version on the same rubric. If it does not beat the best single version, ship the single version.

## Process

1. **Name the job.** One line: who uses this output and what it must make them do, decide or understand.
2. **Build the rubric.** 4–5 criteria taken from that job, each with a weight (×1 to ×3) and a one-line test that two people would apply the same way. "Clear" and "engaging" are banned unless you say for whom and how you would tell. Add one **kill criterion**: a failure that disqualifies a version whatever it scores (a wrong fact, a broken constraint, over the length limit).
3. **List the bets** before writing anything. They must differ on at least two of: structure, who it is for, the core mechanism or argument, what it sacrifices, where it starts.
4. **Write the versions.** Each commits fully to its bet. No hedged middle versions.
5. **Blind them.** Relabel in shuffled order (A–E) and drop the bet names. If subagents are available, hand a fresh one only the job, the rubric and the labelled versions, and use its scores. Otherwise score them yourself as the reader from step 1, never as the author.
6. **Score.** 1–5 per cell, with evidence. Apply the kill criterion. A disqualified version cannot win but may donate a part that passes it. Only then total with the weights.
7. **Merge.** The winner is the base. For each criterion the winner lost, take the part of the version that won it, but only if it fits the base's bet. Refuse any graft that needs the base's structure changed. Graft at most two parts.
8. **Re-score the merge** (rule 6) and deliver.

## Output format

Show this, then the final version. Do not print the losing versions unless asked. In a sketch round, drop the Grafted and Merged lines.

```
TOURNAMENT: <the job, one line>
Rubric: <criterion ×w> · <criterion ×w> · <criterion ×w> · <criterion ×w> | Kill: <criterion>

| Version | Bet | <C1 ×w> | <C2 ×w> | <C3 ×w> | <C4 ×w> | Total (weighted) |
|---|---|---|---|---|---|---|
| A | <bet in ≤6 words> | 4 | 2 | 5 | 3 | <n> (or <n>, killed) |
| B | ... |

Winner: <X>. <One line of evidence for why.>
Grafted: <part> from <Y> (it won <criterion>). Refused: <part> from <Z> (<why it did not fit>).
Merged: <n> vs winner alone <n>.
```

## Anti-patterns

- Versions that share an opening, a structure or a core idea.
- A rubric the first version happens to max out.
- Deciding "B feels strongest", then filling in the table to match.
- Every total within 10% of the others. Either the bets were too close or the rubric cannot tell good from bad. Discard the rubric or the bets and restart from step 2 or 3 once; never tweak a rubric in place after scoring.
- A merge that takes the best sentence from each version and has no voice left.
- Showing all the versions and asking the user to pick. The tournament exists so they don't have to.
- Using the tournament to find faults. It chooses between approaches; breaking the chosen one is `red-team`'s job.
