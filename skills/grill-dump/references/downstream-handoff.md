# Downstream handoff

Use this only after the user confirms the shared understanding and asks for a `shipit`, Spec Kit, ticket, or implementation handoff.

Do not invoke an autonomous delivery workflow as part of formatting the brief. Return text the user can review and pass to the chosen workflow.

## Brief template

```markdown
# <Concise initiative name>

## Problem and desired outcome
<The confirmed problem, beneficiaries, and observable outcome.>

## Requirements
- <Requirement> [N#, S#]
- <Requirement> [N#, S#]

## Constraints
- <Technical, time, budget, policy, or other confirmed constraint>

## Scope
### Now
- <Included behavior or deliverable>

### Later
- <Deliberately deferred item>

### Non-goals
- <Explicit exclusion>

## Confirmed decisions
- <Decision>: <rationale and important tradeoff>

## Acceptance criteria
- <Observable, testable condition>
- <Observable, testable condition>

## Dependencies and risks
- <Dependency, risk, or accepted uncertainty; state its effect>

## First vertical slice
<The smallest end-to-end result that validates the direction.>
```

## Handoff checks

- Include only confirmed requirements; label any accepted assumption explicitly.
- Keep acceptance criteria independent of implementation details unless those details are themselves requirements.
- Preserve source pointers in a separate notes section if the target command should receive clean prose.
- Surface unresolved blocking questions instead of hiding them in the brief.
- For `shipit` (if installed), provide the brief as its feature description and let the user choose its execution options there.
- For Spec Kit (if the project uses it), use the brief as input to its specification step, not as a substitute for any project constitution or later planning gates.
- If the target workflow is not installed, return the brief as plain Markdown for the user to paste into whichever tool they use.
