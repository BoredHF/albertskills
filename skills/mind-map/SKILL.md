---
name: mind-map
description: Turn a spoken or typed brain dump into a branching mind map, built up through repeated rounds of questions until both the user and Claude agree it is complete, and render it as an HTML mind map that can be reopened and resumed later. Use whenever the user types /mind-map, says "mind map this", "let me brain dump", "help me break this idea down", "map out my plugin/game/feature", or rambles about a project idea that needs splitting into features and details (Minecraft plugins, NPC systems, game mechanics, apps, anything), even if they never say "mind map".
model: sonnet
---

# Mind Map

The user thinks out loud, often by voice, so input arrives as long, messy speech. Pull out the **core idea**, split it into **features** (branches), split those into **pieces**, and ask small batches of questions until every piece is understood. Follow the user's own shape (core → features → pieces); don't impose one.

## When not to use

- The user already has written notes: use `md-to-map` to import them, then resume here.
- The idea is small enough to answer in one reply, or they want a plan or code: skip the map.

## Hard rules (keep it cheap)

This skill runs for many rounds, so tokens add up. Everything goes through `scripts/mm.mjs`, which edits the map for you:

- **Never Read or Write `mindmaps/*/map-data.js`, `index.html` or `viewer.js`.** Use `show` to look at the map and `apply` to change it. Every `apply` prints the new stats and the weakest nodes, so you don't need to re-read anything afterwards.
- Patches carry **only what changed**, written as compact one-line JSON. Don't resend fields that are already there.
- **Shorthands:** `"want":["id",...]` accepts suggestions, `"move":{"id":"newParent"}` moves nodes. Use them instead of one `nodes` entry each. Keep summaries and lenses to one short line.
- **The waiter does the mechanical work itself.** WANT, DONT, ADD, DETAIL and CORE from the map are applied by the script (shown as `auto: …`) and never wake you. You only get lines that need thinking: ANSWER, EXPAND, ORGANIZE, SAY. Don't re-apply anything listed under `auto:`.
- **EXPAND / ORGANIZE come with context** (`=== <id>` followed by the subtree with summaries, lenses and details). Work from that. Only call `show` if something you need is missing.
- Statuses, progress, the round number and `working` are computed by the script. Don't set them yourself.
- **No filler.** Don't recap what you saved, because the map shows it. A reply is just the questions (3 at most, one line each), with at most one short line before them when something needs saying. Only show a text tree on the first playback, or when asked.
- **Map-driven rounds** (input came from the viewer): questions go in `"ask"` (at most 3), and the terminal reply is exactly `↪ map`. Nothing else.
- **`ask`:** a multiple-choice quiz the user answers by clicking, one question at a time. Always give `options`: 2–4 short, distinct answers that cover the realistic choices. Set `guess` to the option you honestly think *this* user would pick, judging by their earlier answers; it's pre-selected, so a right guess costs them one click. Add `"multi": true` when several can apply. "Other…" free text is always offered, so don't add an "other" option. Asks are added to their node's open questions and ticked off when answered automatically, so only apply what the ANSWER says.
- Don't echo the user's speech back. Keep only the short quotes worth saving.

`S` = `node ~/.claude/skills/mind-map/scripts/mm.mjs`. Run everything from the user's project folder: maps live in `./mindmaps/<slug>/`, relative to the current directory. The map dir is remembered after `init` (or the first time you pass `mindmaps/<slug>`), so leave it out. Needs Node 18+.

| Command | Use |
|---|---|
| `S list` / `S init "<title>"` | List maps / create `mindmaps/<slug>` with the viewer |
| `S show` / `S show <id>` | Compact outline (`id "label" [status -LFI] 2? ≡3 →links`, where `-LFI` = missing lenses) / one node in full, only when you need its text |
| `node ~/.claude/skills/mind-map/scripts/serve.mjs serve` | **Background, once per session.** Serves the viewer at http://127.0.0.1:4178/ (the port may be higher if busy; use the printed URL, and open that, not the file). Running it again is harmless. |
| `S turn <<'EOF'`…`EOF` | **The round command: background.** Applies the patch, prints stats, then waits for the viewer. |
| `S wait` | **Background.** Waits without a patch (session start). |

**One call per round.** `turn` and `wait` exit the moment the user presses Send, printing one line per change. That wakes you up, so Read the task output once, then answer with a single `S turn` holding all your changes. Don't mark "working" and don't copy ids into `merged`: the waiter makes the node glow and records the ids, and the next patch merges them automatically. Only one waiter runs at a time (a new one replaces the old). If the user replies in the terminal instead, still answer with `S turn`. Without the server, the viewer falls back to copy-and-paste lines, which are handled the same way.

**Export.** Every change rewrites `<dir>/export/<slug>.md` (a short human doc) and `<dir>/export/<slug>.json` (data for other skills) at no token cost. Never write or read these files. Just give their path.

### Patch format

```json
{
  "core": "one sentence, only when it changes",
  "nodes": [
    {"id": "trading", "parent": "interaction", "label": "Trading", "summary": "...", "look": "...", "feel": "...", "interactive": "n/a"},
    {"id": "trading", "details+": ["54-slot chest"], "quotes+": ["their exact words"], "open+": ["A question?"], "connects+": ["prices"]},
    {"id": "trading", "open-": ["A question?"]},
    {"id": "gossip", "remove": true}
  ],
  "agreed": {"agent": true},
  "cores+": [{"id": "economy", "label": "Economy"}],
  "ask": [{"q": "Should players be able to haggle?", "node": "haggling", "guess": "Yes, but only when it's in a good mood", "options": ["Yes", "No", "Only regulars"]}],
  "say": "Only for a real message (not questions)",
  "log": {"focus": "Trading", "learned": "One line on what this round added."}
}
```

- A node op **creates** the node if the id is new (it needs a `label`, and `parent` defaults to root), and **updates** it otherwise. Giving a different `parent` moves it.
- `key+` appends to a list, `key-` removes exact items (`["*"]` clears the list), `key` on its own replaces the list. A field set to `null` is deleted.
- Ids are short kebab-case and never change, because connects point at them.
- Including `log` bumps the round, so include it once per round.

## The four lenses

Every piece is looked at through the user's own four questions: **look** (how it looks), **feel** (how it feels), **interactive** (what the player or user does with it), and **connects** (what it links to). Read them through the end user's experience. For invisible systems like pathfinding, "look" means how it appears to someone watching. Use `"n/a"` only when the user agrees a lens doesn't apply.

A leaf is **done** once all three lenses are answered, it has no open questions, and it isn't an unconfirmed suggestion. A parent is done once all of its children are.

**Details vs. branches.** A branch is something with its own look, feel or interaction. Small facts (a colour, a size, a rule, a one-liner) go in `details+` on the node they belong to. Promote details to a child node only when they need their own lenses.

## Workflow

1. **Start or resume.** Take the topic from the arguments and slugify it. With no topic, run `S list` and ask which map to open, or what the new one is about.
   - **The map exists:** run `S show`, give a two-line status (core, % done, weakest branches), then go to step 4.
   - **In both cases,** start `serve` and `S wait` in the background, and open the URL.
   - **It's new:** run `S init` first. If there's no dump yet, say: *"Go for it, tell me everything in your head about it, in any order."*
   - **It's a Minecraft plugin, mod or in-game system:** read `references/minecraft.md` and split the root into Design and Core.
2. **Absorb the dump.** Find the core sentence, 3–7 features, any pieces the user went into detail on, short quotes, the connections they implied, and contradictions or gaps (these become `open+` questions). Speech-to-text is messy, so read generously, and ask about any word that seems misheard if the meaning matters. Apply all of it in **one** patch.
3. **Play it back.** Show a short text tree, ask them to confirm the core and the branches, and mention once that they can click nodes in the browser to add details, branches or Expand, then press **Send to Claude**. The page updates itself live, so they never need to refresh.
4. **Rounds.** Each round:
   1. Pick the weakest branch from the `apply` output, or whatever the user wants to talk about.
   2. Ask **3–5** concrete questions that are easy to answer by talking, giving options when they help (*"Prefix like `[Shop]` in gold, a symbol, or none?"*). Cover the lenses across the batch and surface connections. Your own ideas go in as `"suggested": true` nodes.
   3. When the answer arrives, put everything you learned in **one** `S turn` with a `log`. Answers often touch other branches, so put each detail where it belongs.
   4. Reply with the next questions only: in the terminal, or as `"ask"` if the input came from the map. Don't ask "want to continue?", because the questions are the prompt.
5. **Pasted viewer changes or "expand X":** read `references/actions.md`.
6. **Finishing** needs both sides to agree:
   - **Yours:** the stats show 100% done and 0 open questions, no suggestions are unresolved, and every feature has a connection (or the user confirmed it stands alone). Do one last pass looking for contradictions or forgotten pieces, then apply `"agreed":{"agent":true}` and say why you think it's complete. The script refuses this while gaps remain.
   - **The user's:** ask them outright. Apply `"agreed":{"user":true}` only when they say it's done.
   - If one side says done and the other doesn't, say what's missing and keep going.
   - When both agree, give a short summary and the path to `index.html`.
7. **Handoff.** Planning or building comes only when the user asks. If they want to turn the finished map into a plan, point at `<dir>/export/<slug>.md` as input for any planning workflow they use.

## Output

Each round ends with at most 3 questions (`ask` if the input came from the map), no recap. A finished map ends with a summary and the path to `<dir>/index.html`; the data lives in `<dir>/export/<slug>.md` and `.json`.

## Anti-patterns

- Rewriting their ideas into corporate language. Labels should sound like them.
- Inventing decisions. Anything you came up with stays `suggested` until they confirm it, unless it clearly follows from their own answers (then add it as accepted; see Expanding).
- Planning or writing code. This is the thinking stage, so let them ask for the next step.
