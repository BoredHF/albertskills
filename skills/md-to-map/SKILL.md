---
name: md-to-map
description: Convert existing Markdown notes (.md files or a whole folder of them) into interactive mind maps, using a script so the notes are never read into context. Use when the user types /md-to-map, or asks to turn notes, docs, plans, ideas or old .md files into a mind map, import notes into the mind map, or "map out this file".
model: haiku
---

# MD → Mind Map

Requires the `mind-map` skill installed next to this one. If `${CLAUDE_SKILL_DIR}/../mind-map/scripts/import.mjs` is missing, stop and tell the user to install `mind-map` first. Don't improvise a converter.

Use this for existing notes. For a fresh idea with no notes, use `/mind-map` instead.

1. Get the path of a `.md` file or folder from the user. If none is given, ask. Don't read the files yourself: the script parses them for free.
2. Run from the user's project folder (maps are written under `./mindmaps/`):

```
node ${CLAUDE_SKILL_DIR}/../mind-map/scripts/import.mjs <file.md | folder> [--out mindmaps]
```

- One map per file, at `mindmaps/<slug>/`. A folder is searched recursively.
- An existing map is skipped, never overwritten.
- Mapping rules: `#` → title, deeper headings → branches, nested bullets → sub-branches, leaf bullets → details, `Look:/Feel:/Does:` → lenses, `- [ ]` → open questions, `>` → quotes, first paragraph → core/summary. Code blocks and tables are ignored.

3. Reply with the script's output lines as they are, plus one line:
`Open: <dir>/index.html in a browser · continue with /mind-map <slug>`

If a file produced 0–1 nodes (prose with no headings or bullets): tell the user, and offer to run `/mind-map <slug>` so it can be structured by asking questions. Don't restructure it yourself unless they ask.

Avoid: reading or summarizing the notes, overwriting an existing map, editing generated `map-data.js` by hand.
