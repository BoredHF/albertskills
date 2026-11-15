---
name: premortem
description: Before significant work, assume it has already failed, write the most likely reasons as specific stories, and turn the top risks into checks built into the plan. Use before anything multi-step, expensive, irreversible or shipped to others (a migration, launch, big refactor, long document, research project), or when the user says "premortem", "what could go wrong" or "before we start".
---

# Premortem

Risk lists come out generic; failure stories do not. Write the failure as history, then build the plan to prevent it.

## Scale

- Skip for tasks under about 30 minutes or easily undone.
- Light: one sentence "most likely way this fails: ..." plus one tripwire.
- Full: the process below.

## Hard rules

1. Write from the future, in the past tense, as a specific failure: "It is three weeks later. The migration was rolled back because..."
2. Every story is specific to THIS work. If it could be pasted into another project's premortem unchanged, delete it.
3. Cover at least four of these sources: wrong problem (built the wrong thing), false assumption, dependency or integration, execution (order, time, skill), reception (user, reader or reviewer rejects it), irreversibility (could not undo).
4. Rate each story likelihood x damage as H/M/L and keep the top 3.
5. Each top risk becomes a tripwire in the plan: an observable signal, the step at which it is checked, and the action if it fires. "Be careful with X" is not a check.
6. The riskiest unverified assumption gets the cheapest possible test, and that test becomes step 1 of the plan.
7. Cap: at most 7 stories and 3 tripwires, then start the work.

## Process

1. State the work and what success looks like, in one line. If no plan exists, sketch it in one line of steps first.
2. Write 5-7 failure stories, one line each.
3. Rate them and pick the top 3. Mark them in the Top 3 column.
4. Write a tripwire for each.
5. Find the riskiest assumption and its cheapest test.
6. Insert the test and the tripwires into the plan at named steps. Cheap fixes for lower-ranked risks go in as plain steps, with no tripwire.
7. Start. When a tripwire's step arrives, check it and say so in one line ("Tripwire 2 checked: clear").

## Output format

```
PREMORTEM: <work> fails if...
It is <when>. <the failure, in the past tense>
| # | Failure story | L | D | Top 3 |
|---|---------------|---|---|-------|
| 1 | <what happened> because <cause>. | H | H | yes |

Tripwires:
1. story #<n> · <signal> · checked at <step> · if it fires: <action>

First: <cheapest test of the riskiest assumption>
```

## Anti-patterns

- Generic risks ("scope creep", "bugs", "time").
- Risks with no check, or checks with no place in the plan.
- A premortem that is never looked at again.
- Fifteen risks.
- Tripwire signals nobody can observe ("if it feels risky").
- Stories of pure bad luck with no cause to act on.
- Using it to argue against doing the work at all.
- Running it after the work: attacking finished work is `red-team`, and the after-the-fact review is `autopsy`.
