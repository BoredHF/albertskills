---
name: ghost-users
description: Simulate 3-5 realistic personas walking through a product, doc or flow, report where each gets stuck, confused or leaves, then fix the worst issues. Use before shipping anything people must use or read without the author present (onboarding, README, landing page, form, CLI, API docs, email), or when the user says "how will users react", "walk through this as a user", "ghost users" or "where will people get stuck".
---

# Ghost Users

The author cannot see their own work as a stranger does. Send in ghosts who know only what is on the page, and let them fail where real people would.

## Scale

- Skip for internal throwaway work, and when the only reader is one expert in the conversation (ask them instead).
- Light: 2 personas (the newcomer and the person in a hurry), first screen or first 5 steps only.
- Full: 3-5 personas, the whole flow.

## Hard rules

1. Personas come from the real audience of this thing, not a stock list. If the audience is unknown, say so and state the assumed one.
2. Each persona has a goal, a context (device, time, mood), what they already know, and a patience budget (for example "leaves after 2 unexplained terms", "gives up after 30 seconds without progress").
3. At least one persona must not fit the author's assumptions: wrong device, wrong prior knowledge, arrived mid-flow, or sceptical of the claim.
4. A ghost knows only what is on the page. No author knowledge, and no reading the source to work out what a button does.
5. Walk literally, step by step, in order, reading the actual words and elements. Do not skim to the intent.
6. Every issue quotes the exact text or element that caused it, and says where it is.
7. Outcomes are exactly: STUCK (cannot proceed), CONFUSED (proceeds unsure or wrongly), LEFT (patience spent), DONE.
8. A persona who sails through is a valid result. Do not invent friction.
9. These are hypotheses, not user research. Say so in one line and never write "users will".

## Process

1. State the thing and the one action it wants from people.
2. Cast 3-5 personas, one line each: who, goal, knows, patience.
3. Walk each persona. Per step record sees / thinks / does. For short text a step is a sentence. Stop that persona at the first STUCK or LEFT.
4. Collect issues, merge duplicates, rank by personas hit x severity (LEFT > STUCK > CONFUSED).
5. Fix the top 3, or every LEFT and STUCK if there are more. Prefer removing the cause over annotating it. Show the revised text or element, not just a description.
6. Re-walk only the changed steps, with the personas that failed there.
7. Report.

## Output format

```
GHOST USERS: <thing> · wants people to <one action>

Cast
- <persona>: goal <..> · knows <..> · patience <..>

| # | Where | Quote | Who | Outcome | Fix |
|---|-------|-------|-----|---------|-----|
| 1 | <step or section> | "<exact text>" | <persona> | STUCK | <change made or proposed> |

Re-walk: <persona> now <outcome>
Hypotheses, not research. Worth testing with a real person: <the one thing>.
```

## Anti-patterns

- Personas that are demographics ("Sarah, 34, marketing") with no goal or patience budget.
- Personas chosen to be easy so that all finish happily, or all failing identically. (Sailing through is valid only for a persona who really fits the page.)
- The ghost using knowledge the page never gave.
- "Users may find this confusing" with no quote.
- Five personas all hitting the same single issue, reported five times.
- Fixing by adding explanatory text everywhere instead of removing the cause.
- Hunting logic or edge-case breaks in the work itself: that is `red-team`.
