# Viewer changes and Expand

## Changes pasted from the viewer

With the live link running, `mm.mjs turn` / `wait` exits and prints compact lines:

```
ADD u-lx3k9a1b2>trading: Bargaining
DETAIL hunger: only when the shop is closed
WANT prefs
DONT gossip
EXPAND movement
ORGANIZE root
ANSWER prefs "Fully random, or weighted?": weighted by shop type
SAY free-form message from the map chat
```

Without the server, the viewer copies a longer message like this for the user to paste. Both mean the same thing:

```
/mind-map npc-brain
Changes from the map viewer (merge these and add their ids to merged):
- [u-lx3k9a1b2] ADD "Bargaining" under "Trading"
- [n-lx3kb2c7d] DETAIL on "Hunger": only when the shop is closed
- [v-prefs] WANT "Preferences"
- [v-gossip] DON'T WANT "Gossip"
- [x-movement] EXPAND "Movement"
```

Treat each line as the user speaking, and handle them all in **one** `turn` patch:

| Line | Patch op |
|---|---|
| ADD | `{"id":"u-lx3k9a1b2","parent":"trading","label":"Bargaining"}`. Keep the given id unchanged. It's the user's own idea, so never mark it `suggested`. |
| DETAIL (older messages say NOTE) | `{"id":"hunger","details+":["only when the shop is closed"]}`. If it actually answers a lens, set that lens instead. |
| WANT | `{"id":"prefs","suggested":false}` |
| DON'T WANT | `{"id":"gossip","remove":true}`. Its connects get cleaned up automatically. |
| EXPAND | Do this last, in the same patch. See below. |
| SAY / MESSAGE | The user talking to you from the map's chat. It isn't tied to any node. Treat it exactly like a chat message: an answer to your questions, a brain dump, a question, or an instruction. Make any map changes in the same patch, and put your reply (including the next questions) in `"say"`. The terminal reply is exactly `↪ map`. |
| ANSWER `<node> "<question>": text` | The user answered that open question in the card. Remove it (`"open-":["<question>"]`) and put what the answer says into the right lens, `summary` or `details`. |
| CORE `<id>: label` | The user wants another core idea on the same canvas. Patch `"cores+":[{"id":"<id>","label":"..."}]` (the first one converts the map into a canvas automatically), then seed 2–4 suggested sections under it with `parent`. In a canvas map, always give `parent`, because a node without one becomes a core. |
| FILL `<node>` | Fill in the gaps on that node and everything under it (the whole map for `root`), using only what's already known: answers, details, quotes, connections. Set missing `look`/`feel`/`interactive`, add short `details+`, and flip suggestions the answers clearly support to `"suggested":false`. Add no new branches (that's EXPAND). Anything that can't be inferred becomes one `ask` question. |
| ORGANIZE `<node>` | Regroup that node's children (or the whole map, for `root`) into 2–6 clear sections. Create each section as a new node with `"suggested":true` and a one-line `summary`, then move the existing children under it with `"parent"`. Never delete content, and keep the user's own section names. |

With the live link, ids are merged automatically. Copy-and-paste messages need their bracketed ids put in `"merged"`.

## Expanding

The user can ask to expand a node or the whole map, either from the viewer or by saying "expand X". Expanding means growing that part of the map from everything known so far: the answers, details, quotes and connections. Run `show <dir> <id>` first if you need a node's full contents.

**Size and focus.** `EXPAND id (few|plenty|lots): focus` — few = 3–4 nodes, plenty = 5–8 (default), lots = 8–12 and may go two levels deep. The text after `:` is what the user wants the branch to grow into; follow it. `(guess)` means no focus given: decide from the whole map what would help most.

Be self-aware: read the whole subtree first (`show <dir> <id>`, plus related nodes from its `connects`) and build on every answer, detail and quote already given. Expand means "do the obvious work for me", not "give me a list to vote on".

1. Add child nodes (count from the size above), each with a one-line `summary`, and split them into two kinds:
   - **Follows from what the user already said** (an answer, detail or earlier choice implies it, e.g. "sleeps at night" → "Closes at night"): add it with `"suggested":false`, and say in the summary or a detail which answer it comes from. The user should never have to click Want on these.
   - **A genuinely new idea** the user might not want: `"suggested":true`.
2. Fill in every lens, detail and `connects` you can infer from the existing answers, on the new nodes **and** on the expanded node itself. A blank lens is only acceptable when nothing known points to an answer, and then it becomes an `"open+"` question.
3. If the expanded node already has suggested children that the answers now clearly support, flip them to `"suggested":false` in the same patch.
4. End with 3–5 questions, but only about real choices left open. Never ask something an earlier answer already settles.

Go deeper as the map matures. Early on, suggest broad pieces. After many rounds, suggest specific mechanics, edge cases, and links between distant branches.
