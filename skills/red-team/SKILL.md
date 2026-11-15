---
name: red-team
description: Before delivering, switches into a hostile critic whose only job is to break the work (edge cases, false assumptions, logic holes, what a sceptical expert would attack), ranks the findings by severity, fixes them, then delivers. Use before handing over anything that will be relied on, shipped, sent or published, or when the user says "red-team this", "poke holes in it", "what's wrong with this", "stress test it" or "be harsh".
---

# Red Team

Reviewing your own work finds the problems you already suspected. An attacker who only wins by breaking it finds the others.

## Scale

| Work | Do |
|---|---|
| A chat answer, a rename, a one-line change | Skip, silently, unless the user explicitly asked for a red team: then do a quick strike. |
| Ordinary work | **Quick strike**: one round, three questions. What input or reader breaks this? Which assumption did I never check? What does the most sceptical expert say first? Fix what breaks and print one line (`Red team: fixed <n> breaks`), or nothing if none. |
| Relied on, public, expensive or hard to undo | **Full attack**: the process below. |

## Hard rules

1. **The author leaves, the attacker arrives.** The attacker did not write this, does not know what was meant, and reads only what is there. Its win condition is a break. "Looks fine" is a loss.
2. **A finding is a concrete break**: a specific input, reader, scenario or counter-example, plus what goes wrong. "Could be clearer" and "consider adding" are not findings.
3. **Prove it where you can.** Code: run the breaking input. A factual claim: open the source. Batch the breaking inputs into one run. A finding you could not prove is marked `suspected`.
4. **Assumptions before details.** The worst breaks are in what the work takes for granted, not in its wording.
5. **Repair, don't hedge.** Adding "may", a caveat or a disclaimer is not a fix. If something cannot be fixed, say so in one line at delivery.
6. **Re-attack the fixes.** Every fix is new work nobody has reviewed, and fixes break things too (a fix that adds `.lower()` while a lookup still uses the raw key).
7. **No invented findings.** If an honest attack finds one real break, report one. Padding to look thorough buries it.

## Process

1. **State the claim.** One line: what this work promises, and to whom. That is the target.
2. **List what must be true** for the claim to hold (3–7 assumptions about inputs, the reader, the environment, the facts). Mark each `checked` or `unchecked`.
3. **Attack through each lens.** Write down every break found.

   | Lens | Ask |
   |---|---|
   | Boundaries | Empty, zero, negative, huge, duplicate, malformed, twice in a row, out of order. For prose: the reader who skims, reads only the first line, or arrives with no context. |
   | Assumptions | Take each `unchecked` item from step 2 and make it false. What happens? |
   | Logic | Where does a step not follow? Where does the conclusion need more than the evidence gives? What is the counter-example? |
   | Sceptical expert | The first objection of the person who knows this field best and wants to say no. |
   | Adversary | Someone exploiting it, misreading it on purpose, or using it for something it was not meant for. |
   | Omission | What the claim requires that is not there: the error path, the cost, the alternative never considered, the "so what". |
   | Time | What breaks in a month, at ten times the size, or when a dependency changes. |

   Start where this kind of work usually fails: code at boundaries and the error path; writing at the first paragraph and the unsupported claim; plans at the dependency and the missing owner; designs at the empty, error and overloaded states; research at the source and the alternative explanation.
4. **Rank.** One row per root cause: if five inputs fail because nothing validates, that is one row naming them all. `Fatal`: the claim from step 1 is false, or the work does harm. `Serious`: a realistic user hits it. `Minor`: real, but rare or cosmetic.
5. **Fix** every Fatal and Serious. Fix a Minor only if the fix is one line; otherwise list it.
6. **Re-attack the changed parts.** A round is one pass over the lenses on the fixes only; add any new break to the table. Stop when a round finds no Fatal or Serious, or after two re-attack rounds. Anything still open gets reported.
7. **Deliver** the table, then the fixed work. Never the original.

If the user asked only for a critique of work that is theirs, stop after step 4 and hand over the ranked findings with a proposed fix for each. Don't rewrite their work uninvited.

## Output format

```
RED TEAM: <the claim>
| # | Severity | Break | Proof | Fix |
|---|---|---|---|---|
| 1 | Fatal | `parse("")` returns 0 instead of failing | ran it | now raises ValueError |
| 2 | Serious | A reader who stops after line 1 never learns the price | n/a | price moved to line 1 |
| 3 | Minor | ... | suspected | not fixed: <reason> |
Open: <what is still broken and why> | none
```

List every Fatal and Serious, plus any Minor you fixed or deliberately left. Mark breaks found in a fix as `(in fix)` under Break. No preamble, no praise.

## Anti-patterns

- Findings that are style preferences.
- The praise sandwich ("overall solid, but").
- Finding only what is easy to fix.
- A finding with no input, reader or scenario attached.
- Fixes that leave the work longer, vaguer and covered in caveats.
- Attacking, reporting and then delivering the unfixed work.
- A third and fourth re-attack round. Two is the limit; say what is left.
- Checking the work against the request (that is `intent-diff`) or walking users through it (`ghost-users`). This skill only tries to break it.
