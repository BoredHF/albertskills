---
name: taste-thief
description: Works out exactly why an example the user admires is good, turns that into specific checkable rules, applies them to the user's work and saves them for reuse. Use when the user says "make it like this", "I love how X does it", "match this style", "steal the taste", "why is this so good", or asks again for a saved taste file.
---

Taste is not a vibe. It is a set of decisions that differ from the default, and those can be listed and checked.

## Scale

- Literal clone wanted: skip this skill. No exemplar given: ask for one. Never invent one from memory.
- Small exemplar (one paragraph, one function): light version. 3-5 rules, no file unless asked.
- Anything larger: full version.
- Saved taste file exists and the user refers to it: list `.claude/taste/` and `~/.claude/taste/`, read the match, skip to Process step 8.

## Hard rules

1. Open the exemplar. Read or fetch the real thing. If you cannot access it, ask for it pasted or screenshotted. Never work from what it is "known for".
2. Quality lives in the contrast. For every observation, state what a competent default version would have done instead. No contrast, no rule.
3. Every rule is checkable: a yes/no question or a number. "Clean", "elegant", "minimal", "polished" are banned as rules. They are what you are explaining.
4. Every rule carries evidence from the exemplar: a quote, a count, a measurement.
5. Steal the principle, not the expression. No copied wording, assets, code or pixel layout.
6. Validate both ways. The exemplar passes every rule. A mediocre example of the same kind (write a one-line one yourself) fails at least half of the rules that apply to it. A rule both pass is hygiene: cut it.
7. The user's stated reason for loving it outranks your analysis. Rules that explain their reason go first.

## Process

1. Get the exemplar and the user's why. Ask at most one question, and only if no reason was given and none can be inferred.
2. Measure before interpreting. Count what is countable: sentence and paragraph length, words per section, number of colours, typefaces and sizes, spacing scale, function length, dependencies, ratio of example to explanation, what comes first.
3. Write the default: 3-5 lines describing the generic competent version of this kind of thing.
4. List the contrasts between the measurements and the default.
5. Find the refusals: what the genre normally has that this leaves out.
6. Write a one-line thesis that explains most of the contrasts. Then write 7-12 rules (3-5 in the light version) in the template below, ordered by how much of the effect each carries.
7. Validate (rule 6). Then save (the light version writes no file unless asked) to `.claude/taste/<slug>.md` in the project, or `~/.claude/taste/` if the user wants it everywhere.
8. Apply. If the user gave no work of their own, skip this step and print only Thesis, Top rules and Saved. Otherwise audit the user's work rule by rule: pass, fail or n/a, with location. Fix the fails in order of rule rank. Where a fix needs a fact you lack, leave a visible `[confirm: ...]` placeholder and count it as unfixed. Report pass counts before and after. If a rule conflicts with the user's content or constraints, the user wins: leave it unfixed and say so.

## Taste file template

```markdown
# Taste: <slug>
Source: <exact title, URL or path> | Date: <YYYY-MM-DD> | Applies to: <kinds of work>
Thesis: <one line>

## Rules
1. **<Imperative rule>**
   Check: <yes/no question or number>
   Evidence: <quote, count or measurement from the exemplar>
   Why it works: <one sentence, including what the default would have done>

## Never
- <what the genre normally has that this leaves out>

## Don't copy
- <brand, wording, assets that belong to the source>
```

## Output format

```markdown
**Thesis:** <one line>
**Top rules:**
- <rule 1, one line>
- <rule 2, one line>
- <rule 3, one line>
| Rule | Before | After | Where |
|------|--------|-------|-------|
| <short name> | fail | pass / n/a / `[confirm]` | <line, section or file> |
**Score:** <n/N> before, <n/N> after
**Saved:** <path>
```

Light version: drop the file line unless one was written.

## Anti-patterns

- Adjectives as rules ("keep it clean").
- Rules any decent example passes.
- Describing the exemplar instead of contrasting it with the default.
- Copying the surface (their colours, their phrases) and missing the decisions.
- 25 rules. Past 12, cut the ones with the weakest evidence.
- Analysing from memory.
- Applying rules that fight the user's content.
