---
name: confidence-map
description: Labels each load-bearing claim and decision as verified, inferred or guessed, so the user knows exactly what to double-check. Use when delivering research, analysis, debugging conclusions, recommendations or summaries of code or documents that the user will act on, or when asked "how sure are you", "what should I double-check", "confidence map" or "did you actually check that".
---

# Confidence Map

Fluent prose hides which claims were checked. Tag the basis of each claim that matters, so the user spends their checking time where it is needed.

## Scale

- Skip for casual chat, creative writing, and tasks where being wrong is cheap and obvious.
- Light version: no inline tags, only the Double-check list.
- Full version when the user will act on the result.

## Labels

- `[V]` verified: observed in this session (ran it, read it, measured it), with an evidence pointer (file:line, command, URL, quote).
- `[I]` inferred: follows from verified facts by reasoning. State the premise.
- `[G]` guessed: from memory, pattern or default, not checked.

## Hard rules

1. Verified requires evidence from this session. Training memory is never verified, however confident.
2. State the scope of every `[V]`: which binary, path, version or file was observed. When several candidates exist (two interpreters, two configs), name each or say which one you checked.
3. Reading code is not running it. "The function exists" can be `[V]` from reading. "It works" cannot.
4. Label only load-bearing claims: those that would change what the user does if wrong. Usually 3 to 10, not every sentence.
5. Cheap-upgrade rule: if a `[G]` or `[I]` can be verified in one tool call or under a minute, verify it instead of labelling it.
6. Never round up. A claim resting on one `[G]` premise is `[G]`.
7. Labels describe the basis, not a feeling. No percentages.
8. A fact the user stated about their own situation is `[I: user said "<quote>"]` unless you can check it, then it is `[V]`.

## Process

1. List the load-bearing claims and decisions.
2. For each, ask "how do I know?" and assign the label by the basis.
3. Upgrade the cheap ones by checking them now.
4. Tag inline at the claim, with the evidence pointer for `[V]` and the premise for `[I]`.
5. Append the Double-check list: only `[G]` and risky `[I]`, sorted by the cost of being wrong (`[G]` before `[I]` on ties), each with the fastest way to check.

## Output format

Inline, in the answer:

```
<claim> [V: <file:line | command | URL | quote>]
<claim> [I: <premise>]
<claim> [G]
```

Then:

```
CONFIDENCE: <n> verified · <n> inferred · <n> guessed
Double-check first:
1. <claim> [G] → check: <how>, costs you <what> if wrong
2. <claim> [I] → check: <how>, costs you <what> if wrong
```

Omit the Double-check list when it would be empty. If everything load-bearing is verified, print one line instead of the CONFIDENCE block:

```
Confidence: all <n> key claims verified this session.
```

## Anti-patterns

- Tagging every sentence.
- `[V]` with no pointer.
- "Likely", "probably" or "should work" in place of a label.
- Percentages.
- Labelling a guess that one command would have settled.
- Hiding the only `[G]` in the middle of ten `[V]`s. List it first.
- Counting a claim as `[V]` because an earlier session or the user's message said so, without checking (rule 8 gives it `[I]`).
