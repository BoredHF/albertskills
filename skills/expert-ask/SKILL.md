---
name: expert-ask
description: Rewrite a short or vague request into the brief a world-class expert in that field would actually ask for, show it briefly, then deliver against it. Use when quality depends on unstated standards ("write a landing page", "design a schema", "write a cold email", "research X"), or when the user says "do it properly", "like a pro would", "expert-ask" or "upgrade my prompt".
---

# Expert Ask

Vague requests get average work because the standards stay unsaid. Say them, visibly, then meet them.

## Scale

- Skip when the request is already a detailed spec, a factual question, or a small edit.
- Light: when the deliverable is under about a page, show two lines, `Success:` and `Avoid:`, then deliver.
- Full: the brief below.

## Hard rules

1. Name the specific expert, not "a senior engineer" but for example "a payments engineer who has run a ledger migration".
2. The upgrade adds what that expert would never leave unsaid: audience and their state, the single success measure, constraints, the standard of the craft, the usual failure of amateurs, the form of the deliverable.
3. Upgrade the bar, not the scope. No new features, sections or deliverables the user did not ask for.
4. Never invent facts about the user's situation. Fill every gap with a visible assumption marked `(assumed)`, on every field not taken from the user's words. Where the work needs facts only the user has, use [placeholders] in the deliverable.
5. Ask a question only if an assumption is both high-impact and unguessable. If so, ask that one question instead of the brief and stop; otherwise proceed.
6. The brief is at most 8 lines (the fields; the header and closing line do not count) and is shown before the work.
7. Deliver against the brief in the same turn. Never show it and wait (rule 5 is the only exception).
8. The user's explicit words always beat the upgrade.

## Process

1. Identify the field and the expert.
2. Write what the user literally asked.
3. List what the expert would ask before starting: audience, success, constraints, standard, failure mode, form.
4. Answer each from the conversation and files first, then by assumption.
5. Write the brief.
6. Deliver the work.
7. End with one line checking the result against the brief's success measure.

## Output format

```
EXPERT ASK (as <specific expert>)
You asked: "<verbatim>"
Upgraded brief:
- Audience: <who, in what state> (assumed)
- Success: <one measurable outcome> (assumed)
- Constraints: <..> (assumed)
- Standard: <what good looks like in this craft>
- Avoid: <the usual amateur failure>
- Deliverable: <form and length> (assumed)
Change any assumption and I'll redo it.
```

Mark `(assumed)` on every field not taken from the user's words, including Standard, Avoid and Constraints when you filled them.

Then the work, then: `Check: <result against the success measure>.`

## Anti-patterns

- A brief longer than the work.
- Generic expert titles.
- Inflating the scope: extra pages, variants or features nobody asked for.
- A quiz of five questions before starting.
- Assumptions hidden in the work instead of marked in the brief.
- A brief that only restates the request in longer words.
- Showing the brief and then waiting.
- Comparing several approaches to the same task: that is `tournament`.
