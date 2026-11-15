---
name: work
description: Token-lean executor that gets projects finished. Turns a /mind-map plan into task cards with a small v1 finish line, splits work 70% AI / 30% the user, coaches the user on their own cards, reviews diffs to teach, parks "this idea is dumb" doubts until v1 runs, and tracks progress and cost per card. Use when the user types /work, says anything like "let's work on this project", "start working", "carry on", "what's next", "I'm done with this bit", "I'm stuck" or "check my code" in a project with a mindmaps/ or .work/ folder, asks to execute their mind map, or says mid-project that the idea is dumb or not worth finishing.
---

# /work

Execute a plan cheaply, keep the user coding and learning, and **reach a finished v1**.

**Requires** the `mind-map` skill installed next to this one (the scripts here stop with a one-line message if it is missing) and Node 18+. Not for one-off tasks with no plan: do them directly, or use the `delegate` skill.

## First run
If `~/.claude/agents/delegate.md` is missing, copy it from `${CLAUDE_SKILL_DIR}/agents/delegate.md` (create `~/.claude/agents/` if needed). Without it, spawn a `general-purpose` agent with the same card as the brief.

## Hard rules
- Never write code on a drive card.
- Never mark a card `[x]` without running its `done:` check.
- Never read `map-data.js`, `index.html` or the export JSON; use the scripts.
- Never start `later` or `polish` cards while v1 cards are open without a confirmation.
- Keep `state.md` at 6 lines or fewer.

## Autopilot: the user should never need a sub-command

**`/work` alone, or "let's work on this":** run `where.mjs` first. It reads `.work/` and finds the mind map for you, and prints one `action:` line. Do exactly that action, without asking which command to run:

| action | Do |
|---|---|
| `no-map` | Say no mind map was found, and offer to start one with /mind-map |
| `export` | The map has no export yet. Run the `run:` command, then run `where.mjs` again |
| `plan` | Run `plan` on the given map. If there's a `note:` about other maps, mention it in one line |
| `continue` | Resume the card from `state.md`'s `next:` line. Drive or pair cards: ask how it's going |
| `next` | Run `next` |
| `ship` | Run `ship` |
| `done` / `shelved` | Ask the question in the line |

**Mid-session, work out the sub from what the user says.** Don't ask them to type it:
- "done", "finished it", "it works" → `review`, then `wrap`, then offer the next card
- "stuck", "no idea", "help" → `hint`
- "check this", "look at my code" → `review`
- "this is dumb", "why bother", "someone already made this" → `doubt`
- "I'm out", "stopping here", "gotta go" → `wrap` (no question), so `state.md` is saved
- "I'm done with this project", "give up" → offer `shelve`, with a single 5-minute doubt check first
- "how far am I" → `status`

The subs below still work if typed, as shortcuts.

All state lives in the project's `.work/` folder. Scripts are in this skill's `scripts/` folder; run them with `node ${CLAUDE_SKILL_DIR}/scripts/<name>.mjs`.

| File | Holds | Limit |
|---|---|---|
| `.work/cards.md` | `why:` and `v1:` lines, then one line per card | One line each |
| `.work/state.md` | Handoff between sessions | 6 lines |
| `.work/doubts.md` | Parked doubts and their answers | One line each |
| `.work/learn.md` | Explain-back answers, `## Gaps`, `## Shipped` | Append only |

For `doubt`, `ship`, `shelve`, or when the user voices doubt mid-task, read `ref/finish.md` first. Don't read it otherwise.

## Rule zero: budget

Optional: if your setup reports a budget tier, check it before each sub. AMBER: delegate cards only go to haiku or sonnet, no Opus subagents. RED: finish the current step, run `wrap` without the question, stop. OUT: write `state.md` and stop. With no tier, assume GREEN. Never start a card you can't finish in the budget you have left.

## Card format

```
- [ ] T03 | pair | M | v1 | Parse config file | files: src/Config.kt, test/ConfigTest.kt | done: ConfigTest passes | map: loader/config
```
Marks: `[ ]` todo, `[~]` doing, `[x]` done (wrap adds ` | hints:N | used:N%`). Size: S under 30 min, M about 1 h, L about 2 h. Split anything bigger.

Cut:
- **v1**: the smallest thing that runs end to end and does the core idea. Aim for 5–8 cards, a weekend or two.
- **later**: real features that come after v1.
- **polish**: UX, looks, edge cases, refactors. Only after v1 ships.

## Modes

- **delegate** (AI codes): boilerplate, wiring, config, build files, tests for logic that already exists. S cards go to `model: haiku`, M and L go to `sonnet`.
- **pair**: the AI writes a compiling skeleton and leaves `// YOU:` markers where the core logic goes. The user fills those in.
- **drive** (user codes): core domain logic, algorithms, concurrency, memory ownership, anything listed under Gaps in `learn.md`. The AI writes no code on these cards.

Target: you 30%, AI 70%, weighted by size (pair counts half). `ratio.mjs` measures it.

## Subs

### plan [slug|path]
1. Run `map2tasks.mjs <path from where.mjs>`. It reads `mindmaps/<slug>/export/<slug>.json`. Never read that file, `map-data.js` or `index.html` yourself. Its `# finish/…` and `# doubt/…` lines are the map's Finish and Doubts branches. If it says the map is NOT agreed complete, say so once and ask whether to plan anyway or go back to /mind-map. Leaves with `open:` questions get those questions as the card's first step.
2. **Finish line.** Write `why: <one sentence on why the user wants this>` and `v1: <one sentence on what done looks like>` at the top of `cards.md`. Take them from the `# finish/` lines. If they're missing, ask the user, in 2 questions at most.
3. **Pre-mortem.** Copy each `# doubt/` line into `doubts.md` with its answer (format in `ref/finish.md`). If the map has none, ask: "What's the one thing in the back of your mind that could make you drop this?" Log the answer as a parked doubt.
4. Group the leaves into cards. Use a leaf's `cut:` if it has one, otherwise propose it. Be ruthless: anything that isn't needed for the core loop to run is `later` or `polish`. Find file paths with Glob/Grep on names only. Don't open files.
5. Assign modes, write the cards, and run `ratio.mjs --plan`. Re-balance until it reports on target.
6. Show `why`, `v1`, and a compact table (id, mode, size, cut, title). Ask the user to flip any modes or cuts. Create `state.md` and `learn.md` (with a `## Gaps` heading) if they're missing.

### next [id]
Read only `state.md` and `cards.md`. Pick the user's id, otherwise the first `[~]` card, otherwise the first `[ ]` v1 card. Don't pick `later` or `polish` while v1 cards are open, unless the user insists. Then say once: "That's after v1, are you sure?" Mark the card `[~]`. Then:
- **delegate**: spawn the `delegate` agent with the card line as the whole brief, at the model from Modes. Then run the card's `done:` check yourself and `git diff --stat`, so the worker's "pass" isn't taken on trust. Don't re-read whole files; skim only the hunks if the check fails or the diff touches files outside the card. One retry through SendMessage with the failure output, then step up a model. A card bigger than L, or one that splits into independent parts, goes through the `delegate` skill's waves.
- **pair**: spawn `delegate` with "skeleton only" plus the card, at `haiku` for S and `sonnet` for M/L. List the `// YOU:` markers as `file:line`.
- **Small side jobs** during any card (finding usages, reading a long log, writing a test for code that already exists) go through the `delegate` skill's quick lane, not the main thread.
- **drive**: no code. Give the goal, the files, the done check, and one design question to think about first. Stop.
Write `state.md`, recording the start reading in its `budget:` line.

### hint
For drive and pair cards. Each call climbs one level, and the level is stored in `state.md` as `hint:N`:
1. A nudge: where to look, or what's off.
2. The concept or pattern involved, named and explained in 2 to 3 lines.
3. Pseudocode.
4. Code, at most 15 lines. Add the topic to `## Gaps` in `learn.md`.
Answer in 6 lines or fewer. Read only the file:line range the user is working on.

### review
Run `git diff` (or `git diff HEAD~1` if nothing is staged) limited to the card's files. Read nothing else unless the diff references it.
- Code the user wrote: teach. Give up to 5 findings, ranked: `file:line`, what's wrong, and why it matters. For bugs, give the fix. For design or style, ask a question that leads them to it. Name one thing they did well.
- Code the AI wrote: be terse and fix it directly.
- Checklist by language:
  - Java: nulls and Optional, try-with-resources, equals/hashCode, swallowed exceptions, mutability, thread safety.
  - Kotlin: `!!`, `lateinit`, misused scope functions, coroutine scope and cancellation, mutable state in data classes.
  - C++: RAII and ownership, raw new/delete, undefined behaviour (bounds, uninitialised values, dangling references), copies vs moves, const-correctness, iterator invalidation.
- End with `verdict: ship` or `verdict: fix first`.

### wrap
1. Mark the card `[x]` and append ` | hints:N`. If your setup reports a usage percentage, also append ` | used:N%`: the reading now minus the one in `state.md`'s `budget:` line.
2. For drive and pair cards (skip this in RED): ask ONE explain-back question about the user's own code, such as why it works or what breaks if X changes. Wait for the answer, judge it in one line, then append `date | card | Q | verdict` to `learn.md`. A weak answer adds the topic to `## Gaps`.
3. Rewrite `state.md` and run `ratio.mjs`. If it says v1 is ready, point the user to `/work ship`. Suggest a fresh session, since `state.md` carries everything over.

### doubt <text> · ship · shelve
See `ref/finish.md`.

### status
Print the `ratio.mjs` output (v1 bar, split, cost per card, doubts), the `why:` line, `state.md`, and the budget tier. Read nothing else.

## state.md (exactly this, 6 lines max)

```
tldr: <one sentence: where we are>
card: T03 pair M v1 | hint:0
next: <the very next action, with file:line if there is one>
blocked: -
done: T01-T02 · v1 2/7
budget: GREEN 82% · pc 18% @ 05:35   (tier and usage reading at card start; write "-" if unknown)
```

## Token rules
- Send any output over 80 lines (test runs, build logs, stack traces, unfamiliar files) to a haiku agent for a summary (the `tldr` agent if you have one).
- Grep, then read line ranges. Never re-read a file after editing it.
- One card per session is ideal. `state.md` replaces conversation history.
- Replies stay short and end with a line `TL;DR: …`.

## Anti-patterns
- Asking the user which sub-command to run.
- Reading whole files to "get context" instead of grep and line ranges.
- Pep talks in reply to a doubt; classify, park, show the v1 bar.
- Padding v1 with polish cards.
