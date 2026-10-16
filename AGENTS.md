## Application Building Context

Read the following files in order before implementing
or making any architectural decision:

1. `context/project-overview.md` — product definition,
   goals, features, and scope
2. `context/architecture.md` — system structure,
   boundaries, storage model, and invariants
3. `context/ui-context.md` — theme, colors, typography,
   and component conventions
4. `context/code-standards.md` — implementation rules
   and conventions
5. `context/ai-workflow-rules.md` — development workflow,
   scoping rules, and delivery approach
6. `context/progress-tracker.md` — current phase,
   completed work, open questions, and next steps

Update `context/progress-tracker.md` after each
meaningful implementation change.

If implementation changes the architecture, scope, or
standards documented in the context files, update the
relevant file before continuing.

## Context directory

Do not create files or subdirectories in `context/` unless the user explicitly requests them.
Use existing context files for the required updates described above.
Store review reports, audit findings, and other task-specific documents outside `context/`.

## Documentation and API Verification

Never rely on trained model memory or assumptions for external APIs, libraries, frameworks, SDKs, or CLI tools. Training data is often outdated and out of sync with installed package versions.

### Verification Scope

- Mandatory for all third-party dependencies, frameworks, SDKs, external APIs, and CLI tools.
- Core language built-ins (standard library features of the language itself) do not require documentation lookups.

## Writing standard

Apply these rules to all prose created or edited in this workspace, including documentation, plans, UI copy, and summaries.

- Load and follow `.agents/skills/unslop/SKILL.md` to remove filler, formulaic phrasing, and unsupported claims.
- Match the tone and level of detail to the audience, purpose, and existing project conventions.
- Use neutral, precise language for technical documentation and factual summaries. Keep recommendations distinct from verified facts.
- Use a direct, natural tone for plans, discussions, and user-facing copy. Add opinions or informal language only when the purpose requires them.
- Preserve the intended meaning and factual uncertainty. Do not invent evidence, results, or details to improve the prose.

## ASD-STE100 for technical writing

Load and follow `.agents/skills/asd-ste100/SKILL.md` when creating or editing English technical prose, regardless of file format.
This includes READMEs, setup instructions, architecture descriptions, API documentation, code comments, and technical summaries.

- Apply the guidance to technical passages in mixed documents. Match the remaining passages to their audience and purpose.
- Use clear instructions, consistent terminology, and explicit references. Keep prerequisites and actions in the required order.
- Technical accuracy takes priority over stylistic simplification. Preserve conditions, limits, exceptions, units, and causal relationships.
- Preserve exact code, commands, paths, identifiers, API names, UI labels, quotations, and externally controlled wording.
- Describe the output as STE-guided unless all applicable rules, vocabulary, and technical terms have been checked against the official standard.
