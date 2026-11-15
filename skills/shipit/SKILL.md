---
name: shipit
description: End-to-end feature delivery pipeline - grill requirements, run specify→plan→tasks→implement with model split, review/fix, then optionally PR/CI and merge/release.
---

# shipit

Run a complete feature-delivery workflow from a feature description to optional PR/merge/release.

Not for small fixes or one-file changes: just make the change. Use this when the feature merits a spec, plan and task list.

## Requirements (check first)
- **Spec Kit** installed in the project, so the slash commands `/speckit-specify`, `/speckit-plan`, `/speckit-tasks` and `/speckit-implement` exist (github.com/github/spec-kit).
- Optional: a `grilling` skill and a `code-review` agent. Without `grilling`, run the requirements interview yourself (step 3). Without `code-review`, use a general-purpose agent with a review brief.
- `git`, and `gh` or the repo host's CLI if the PR path is chosen.

If Spec Kit is not installed, **stop and say so**, naming the missing commands and the link above. Do not improvise the specify/plan/tasks/implement pipeline by hand, and do not run any phase.

## Hard rules
- No `AskUserQuestion` after Phase 1.
- Never skip a failed step silently.
- Never exceed the fix-cycle caps (5 for CI, 5 for release, 2 for review).
- Never merge or release unless Phase 1 locked it.

## Invocation contract

1. If the user invoked this skill with a feature description, use it.
2. If no description was provided, ask in normal assistant chat for the description and wait. **Do not use `AskUserQuestion` for this step.**
3. After a description is available, **grill the requirements first**. If a `grilling` skill is installed, invoke it. Otherwise interview the user yourself: ask the open decisions in rounds, give a recommended answer to each, and wait for replies before moving on.

## Phase 1: Grill-and-lock session (interactive)

Use `AskUserQuestion` to collect and confirm all decisions up front. This is the **only** interactive phase.

You must confirm each run:

1. The feature description/scope (using the provided description as starting point).
2. Model split:
   - `/speckit-specify` = `claude-opus-5-5` (default, expensive)
   - `/speckit-plan` = `claude-opus-5-5` (default, expensive)
   - `/speckit-tasks` = `claude-opus-5-5` (default, expensive)
   - `/speckit-implement` = `claude-sonnet-5-5` (default, cheaper)
3. Optional invocation overrides (if provided in user text), but still confirm before execution.
4. Post-implementation action (**collect now, do not ask later**):
   - Recommended: create PR, wait for CI, auto-fix failures
   - Alternative: stop after implementation + review recommendations are applied
5. If PR path is selected, post-CI action (**collect now, do not ask later**):
   - Recommended: stop when PR pipelines are green
   - Alternative: merge using default merge options, then cut a release
6. Release bump policy (if release path might be used):
   - Suggest **patch** for bugfix/compat-only work
   - Suggest **minor** for new user-visible capability
   - Confirm the selected bump during this initial session
7. Failure-handling cap:
   - Up to **5** auto-fix cycles for CI/release failures

At the end of this phase, produce a compact locked execution summary and proceed autonomously.

## Phase 2: Autonomous execution (no more AskUserQuestion)

After Phase 1 completes, **do not call `AskUserQuestion` again**.

1. Run:
   - `/speckit-specify` (claude-opus-5-5 by default)
   - `/speckit-plan` (claude-opus-5-5 by default)
   - `/speckit-tasks` (claude-opus-5-5 by default)
   - `/speckit-implement` (claude-sonnet-5-5 by default)
2. Ensure implementation includes spec artifacts in commits/PR by default.
3. Review/fix loop:
   - Run expensive review with claude-opus-5-5 (`code-review` agent).
   - Apply fixes with claude-sonnet-5-5.
   - Re-review with claude-opus-5-5.
   - Stop when no material findings remain, or after 2 review/fix cycles.
4. If locked decision is “stop after implementation”, stop here and report outcomes.

## Phase 3: PR/CI (conditional)

If locked decision is PR path:

1. Commit changes.
2. Push branch.
3. Create PR.
4. Wait for PR pipelines.
5. If pipelines fail, fix and rerun until green or max **5** CI fix cycles reached.
6. If locked PR outcome is “stop when green”, stop and report.

## Phase 4: Merge + release (conditional)

If locked PR outcome includes merge+release:

1. Merge PR using default merge options.
2. Cut release with the previously confirmed bump type (patch/minor).
3. Wait for release pipeline.
4. If release pipeline fails, fix and retry until success or max **5** release fix cycles reached.

## Final report
End with: feature, branch/PR link, per-phase result, review cycles used, and release tag if any. Five lines or fewer, then `TL;DR:`.

## Anti-patterns
- Asking the user something new mid-run instead of using the locked summary.
- Reading the setup's model names as fixed: confirm them in Phase 1, since they are defaults.
- Calling the spec commands before Spec Kit is confirmed present.
- Leaving spec artifacts out of the commit.

## Operational rules

- Keep updates concise and outcome-first.
- Do not silently skip failed steps.
- If max retry cap is reached, stop with a clear blocker summary and exact failing pipeline/run links.
