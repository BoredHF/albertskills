---
name: stuck-detector
description: Notices when you are looping, stops, names the pattern and forces a different kind of action. Trigger the moment a tripwire fires mid-task (third attempt at the same idea, same command failing twice, a fix that breaks an earlier fix), or when the user says "you're going in circles", "you already tried that", "this isn't working" or "step back".
---

# Stuck Detector

A loop feels like progress from inside. Count attempts by idea, and when a tripwire fires, the attempt you are about to make is the loop.

## Scale

- Normal iteration where each attempt teaches something new is not a loop. Never fire on a first attempt unless the user says you are looping. A second attempt fires only the identical-command tripwire.
- Check tripwires silently on every step. Print output only when one fires.
- The block is 4 lines and the whole report at most 6. Never write an essay about being stuck.

## Tripwires

| Tripwire | Fires on |
|---|---|
| Same idea retried | 3rd attempt, counted by idea, not wording |
| Same command failing | 2nd identical failure, or 3rd with cosmetic changes |
| Whack-a-mole | A fix breaks something fixed earlier, twice |
| Complexity ratchet | Solution grew 3 times (flag, special case, wrapper, caveat) while the core problem has not moved |
| Undo/redo | Back in a state you were in before |
| Rewrite churn | 3rd rewrite of the same paragraph, section or component with no new information |
| No new evidence | 3 actions in a row that taught nothing |
| "This should fix it" | Said twice about the same problem |

## Hard rules

1. A tripwire means stop. Do not make the attempt you were about to make.
2. Print the STUCK block before any other action.
3. The next action must be a different kind of action, not a variant. If the last three were edits, the next is a read, a measurement or a question.
4. The hypothesis is the suspect. List what has been assumed and never verified, then check the cheapest one first.
5. After two failed strategy switches, stop and ask the user one specific question, stating what was tried.
6. Count honestly by idea. Rewording the same fix does not reset the count.

## Process

1. Name the tripwire that fired and the idea being repeated.
2. Pick the pattern from the table below. Match on the cause, not the tripwire name.
3. Write the STUCK block.
4. Do the switch action and report what it showed, before editing anything.
5. If the cause is found, print the Unstuck line. If the loop came from your own mistake, hand it to `failure-museum`. If the switch action shows nothing, that counts as a failed strategy switch (rule 5).

| Pattern | Cause | Switch to |
|---|---|---|
| Same-fix loop | Hypothesis wrong but unquestioned | Stop editing. Write the hypothesis. Design one observation that could falsify it |
| Flailing command | Reacting to error text | Read the whole error, the docs or `--help`. Check versions, paths, permissions |
| Whack-a-mole | Symptoms of a shared cause | List all symptoms together, find what they share, fix that |
| Complexity ratchet | Wrong approach being patched | Return to the last simple state. Ask what the 10-line version is |
| Ping-pong | Two constraints conflict | State both. Ask which wins, or find the design where they do not collide |
| Rewrite churn | Purpose unknown | Stop writing. State the one thing it must do for the reader |
| Blind search | No model of the system | Shrink it: minimal reproduction, bisect, smallest failing example |
| Assumption lock | "It can't be X" | Verify the thing you are sure about |

## Output format

```
STUCK: <pattern> (tripwire: <which fired>)
Tried: <idea> ×n, <idea> ×n
Assumed without checking: <...>
Switching to: <different kind of action>, which will tell me <what>
```

After resolving, one line:

```
Unstuck: the cause was <x>; the wrong assumption was <y>.
```

## Anti-patterns

- "One more try" before switching.
- Naming the pattern, then doing the same thing.
- Switching to a variant of the failed approach and calling it a new strategy.
- A stuck report longer than 6 lines (the STUCK block is 4).
- Asking the user "what should I do?" instead of one specific question.
- Silently abandoning the goal for an easier one. If the goal must change, say so.
- Listing assumptions that are really verified facts, to fill the line.
