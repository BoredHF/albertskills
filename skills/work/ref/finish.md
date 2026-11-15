# Getting to finished

The user tends to drop projects in the middle stretch. That's when the "this idea is dumb" voice shows up: the exciting part is over and the finish line is still far away. That voice is about the stage of the project, not proof the idea is bad. Your job is to get them to a running v1 and judge the idea then, with something real in front of them.

## doubts.md

```
- 2026-11-06 | exists | "someone already built this" | parked
- 2026-11-06 | too-big | "this will take months" | answered: cut T09-T12 to later
```
Kinds: `exists`, `useless`, `not-good-enough`, `bored`, `too-big`, `other`. Doubts that came from the mind map's Doubts branch get `| pre-mortem: <answer>` in place of `parked`.

## /work doubt <text>
Also use this when the user says mid-task something like "this is dumb" or "why am I even doing this". Offer to log it, in one line.
1. Classify the doubt and append it as `parked`.
2. Reply in 3 lines or fewer, with no pep talk or long argument:
   - **exists**: Yours is built your way and is teaching you. Check whether theirs does your `why:`. Parked until v1.
   - **useless**: You can't judge usefulness without something running. v1 is the test. Parked.
   - **not-good-enough**: Point to `learn.md`, since the gaps closed so far are the evidence. Drive cards exist so they can grow.
   - **bored**: That's the middle stretch, not the idea. Offer the smallest v1 card, or the 15-minute version of the current one.
   - **too-big**: This one is actionable now. Propose moving specific cards to `later` and apply it if they agree.
3. Show the v1 bar (`ratio.mjs`) so the remaining distance is concrete.
4. If there are 3 or more parked doubts in 7 days, or the same kind twice, offer a 5-minute check: **continue** (as is), **cut** (shrink v1), or **shelve**. The user decides. Never push either way.

## /work ship (all v1 cards done)
1. Run the full build and tests through a haiku summarizer agent (the `tldr` agent if you have one). If they fail, the fix becomes the next card, and ship stops here.
2. Write a "what it does / how to run it" section of 3 lines or fewer in the README. Ask before any git tag or commit.
3. **Doubt review**: go through every parked doubt with the user and mark it `answered: <one line>` or `still true`. This is the payoff, so let them see which fears didn't come true.
4. Append to `learn.md`: `## Shipped v1 <date>` followed by 3 lines: built, learned, surprised by.
5. Ask what's next: **later** cards, **polish** cards, **done** (it's finished, and that counts), or **shelve**.

## /work shelve
Stopping on purpose is a finish, not a failure. Write `.work/shelved.md`:
```
date: <date> · v1 <n>/<m>
built: <what exists and runs>
learned: <top 2 things, from learn.md>
why stopped: <their words>
come back if: <what would make it worth resuming>
```
Set `state.md` tldr to `SHELVED: <why stopped>`. Say plainly that a shelved project with a note is a closed loop, and that the code and lessons stay usable later.
