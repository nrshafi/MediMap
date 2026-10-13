# AI workflow rules

## Approach

Build MediMap in small feature units against the PRD and context files.
Complete each feature across its required database, backend, UI, and tests before starting the next feature.
Keep each unit small enough to verify as a working user flow.

Before implementation or an architectural decision, read these files in order:

1. `context/project-overview.md`
2. `context/architecture.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

New explicit user decisions take priority. Update conflicting requirements before implementing the new behavior.

## Scoping rules

- Work on one feature unit at a time.
- Include related changes across database, backend, UI, and tests when the same feature requires them.
- Do not combine unrelated features or speculative refactoring in one unit.
- Split a large feature into smaller working flows with explicit acceptance criteria.
- Preserve unrelated local work and existing user changes.

## Handling missing requirements

- Proceed with routine implementation choices within the agreed scope.
- Ask about ambiguous product behavior, scope changes, paid services, destructive actions, and production deployment.
- Record unresolved requirements in `progress-tracker.md`.
- Resolve ambiguity in the relevant context file before implementing dependent behavior.
- Continue independent work while a question remains open.
- Do not treat example values in templates as approved decisions.

## Git workflow

- Work on the current branch.
- Commit only when explicitly requested.
- Push only when explicitly requested.
- Do not create branches or pull requests unless requested.
- Ask before merging or deploying to production unless the current request already authorizes that action.
- Do not discard unrelated changes or rewrite history without authorization.

## Dependencies and documentation

- Prefer existing packages.
- Add a dependency when the feature needs it, after checking documentation, compatibility, and maintenance.
- Explain the dependency choice in the delivery summary.
- Verify third-party APIs, libraries, frameworks, SDKs, and CLI tools before use.
- Match documentation to selected or installed versions.
- Use official documentation when the documentation connector is unavailable.
- Core language built-ins do not require documentation lookups.
- Use free tiers first. Obtain explicit approval before enabling paid services.

## Protected content

Do not edit third-party package internals as an application fix.
Keep secrets out of source files, logs, screenshots, and delivery summaries.
No additional project file protections have been selected. Revisit generated-file rules when the application scaffold exists.

## Keeping documentation in sync

Update the relevant context file before continuing when implementation changes architecture, storage, scope, or standards.
Update `progress-tracker.md` after every meaningful implementation change.
Include the current date and time in Asia/Dhaka.
Record what changed, what passed verification, what remains open, and the next feature unit.
Keep documentation product-focused and follow the requested terminology restrictions.
Apply the workspace unslop and ASD-STE100 skills to the relevant prose.

## Before moving to the next unit

1. Verify the feature against its acceptance criteria.
2. Check the architecture invariants.
3. Run type checking and linting.
4. Run relevant automated tests, including browser tests when the core flow changes.
5. Run the production build.
6. Check changed screens manually on mobile.
7. Update the relevant context files and progress tracker.
8. Report failed or unavailable checks without claiming success.

Select exact commands after the package manager and application tools are chosen.
For documentation-only changes, review the documents and links. Application checks apply when application code exists or changes.

## Delivery schedule

| Milestone | Target date | Required outcome |
| --- | --- | --- |
| Core features | 15 November 2026 | Required features work across database, backend, UI, and relevant tests. |
| Dataset and full-flow checks | 22 November 2026 | Check coverage for the selected hospitals and branches. Verify complete user flows. |
| Release candidate | 29 November 2026 | Completion checks pass. Record any remaining issues. |
| Final delivery | Early December 2026 | Exact date remains open. |

These are agreed targets, not completed milestones.

## Next phase

Fill `context/ui-context.md` before UI implementation.
Define the visual theme, colors, typography, components, layouts, icons, and interaction states in that phase.
The initial static page uses the conventions now recorded in `ui-context.md`.
Define interaction states before implementing functional controls.
