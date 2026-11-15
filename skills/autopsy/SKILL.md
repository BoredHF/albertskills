---
name: autopsy
description: After a long session or finished project, analyse what worked, what wasted time and what to change, and save the lessons (feeding `failure-museum`). Use at the end of a long session or project, after a painful task, or when the user says "autopsy", "retro", "what did we learn", "what went wrong in that session" or "how could that have gone faster".
---

# Autopsy

Impressions of a session are flattering and vague. Read the record, price the waste, and keep only lessons that change what happens next time.

## Scale

- Skip for short or smooth sessions, and say nothing.
- Light: three lines (one thing that worked, one that wasted time, one change). Write no file unless a mistake needs logging.
- Full: the process below.

## Hard rules

1. Work from the record (conversation, git log, diffs, test output), not from impression. Where the record is thin, mark that finding as inferred.
2. Rebuild the timeline first.
3. Measure waste in real units (turns, tool calls, rewrites, reverted commits), never "some time".
4. Each finding names the earliest moment it could have been caught and the signal available then.
5. At most 5 lessons. More will not be applied.
6. A lesson is a behaviour change with a trigger ("when X, do Y"), not an observation.
7. Route every lesson. A mistake of Claude's follows `failure-museum`'s Admit steps: search for the same root cause and update that exhibit (Repeats +1), else add a new one with its Root cause (about Claude's process), Rule, Applies when and Check, and follow its first-time setup if the file is new. No second copy here. A user preference goes to memory or CLAUDE.md, only with the user's agreement. A thing that worked goes under `Keep:` in `.claude/autopsy-log.md`, as a dated heading and one line per item. If a file cannot be written, print the entry and say it is not saved.
8. Include what worked, with the reason, so it is repeated on purpose.
9. No blame of the user and no self-flagellation. Findings only.

## Process

1. Gather the record.
2. Write the timeline in 5-10 lines: phase, what happened, cost.
3. Mark each phase Worked, Wasted or Neutral.
4. For each Wasted phase: cause, earliest catch point, lesson.
5. Pick up to 5 lessons, ranked by time saved next time.
6. Route them (rule 7). Lessons that are Claude mistakes already logged this session are only linked.
7. Append the dated Worked and Lessons lines of the report to `.claude/autopsy-log.md`.
8. Report.

## Output format

```
AUTOPSY: <task> · <duration or turns>
Timeline:
- <phase> · <cost> · Worked | Wasted | Neutral
Worked:
- <what> · because <reason>
Wasted:
- <what> · cost <units> · catchable at <moment>
Lessons:
1. when <trigger>, <do this>
   → <where it was saved>
Biggest single change for next time: <one line>
```

## Anti-patterns

- A narrative recap of the session.
- Lessons like "communicate better" or "plan more".
- Ten lessons.
- Lessons saved nowhere.
- Listing only failures.
- Rewriting history to look deliberate.
- A second copy of an exhibit `failure-museum` holds: update that exhibit instead.
