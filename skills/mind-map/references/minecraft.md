# Minecraft-aware branching

Read this when the topic is a Minecraft plugin, mod, datapack, server feature, or a game system that runs inside Minecraft (NPCs, shops, minigames, economies).

## Two halves

Split the root into two top-level branches so look-and-feel decisions never get buried under mechanics:

- **Design** — everything the player sees and reads.
- **Core** — everything the plugin actually does.

Features go under Core. Design holds the shared visual language; individual Core features still have their own `look` lens for feature-specific visuals, and should `connects` back to the Design nodes they use.

## Design half — starter nodes

Propose these as `suggested: true` and let the user confirm, rename or drop them:

| Node | Questions worth asking |
|---|---|
| Theme & vibe | Stable/serious, clean, minimalistic, playful, medieval, sci-fi? Any server it should feel like? |
| Colour palette | Primary / secondary / accent colours? Legacy `&` codes or hex (1.16+)? Gradients via MiniMessage? |
| Chat prefix | Is there one? Exact text and colours, e.g. `[Shop]` in gold? Shown on every message or only some? |
| Messages | Tone (formal, friendly, jokey)? Success / error / info colours? Configurable in a messages file? |
| Menus (GUIs) | Chest size, filler glass colour, border style, item names & lore format, back/close buttons, paging? |
| Sounds & particles | Click sounds, success/fail sounds, particle effects? |
| Scoreboards / bossbars / titles / action bar | Which are used and for what? |

## Core half — questions to weave in per feature

Not every question fits every feature; pick the ones that matter.

- **Commands** — names, aliases, arguments, tab completion, who can run them.
- **Permissions** — nodes per action, default (op / everyone), bypass perms.
- **Config** — what server owners should be able to change without code.
- **Data** — what gets saved (per player, per world, global), and where (YAML, SQLite, MySQL).
- **Events / triggers** — what in-game action kicks this feature off.
- **Edge cases** — player logs out mid-action, server restarts, inventory full, other plugins interfering.
- **Dependencies & version** — server software (Paper/Spigot/Folia), MC version, Vault, PlaceholderAPI, Citizens, etc.

## Reading the four lenses in Minecraft terms

- **Look** — blocks, items, skins, particles, GUI layout, text colours.
- **Feel** — pacing, sounds, how rewarding or punishing it is, does it feel alive or mechanical.
- **Interactive** — clicks (left/right/shift), commands, chat input, walking into areas, NPC dialogue.
- **Connects** — other features, the Design nodes it uses, other plugins (economy, permissions).
