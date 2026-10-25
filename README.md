# MediMap

MediMap is a diagnostic-service discovery and price-comparison project for Dhaka, Bangladesh.
The home page has a static "Coming soon" page. The `/discovery` route demonstrates search with unverified sample data.

Built with React, TypeScript, TanStack Start, and Vite.

## Prerequisites

Use stable [Bun](https://bun.com/docs/installation) 1.4.4, the version selected in `package.json`.

## Commands

| Task                                                 | Command                         |
| ---------------------------------------------------- | ------------------------------- |
| Install dependencies                                 | `bun install --frozen-lockfile` |
| Start the development server                         | `bun run dev`                   |
| Create a production build                            | `bun run build`                 |
| Check types                                          | `bun run typecheck`             |
| Run unit and component tests                         | `bun test`                      |
| Inspect unit and component coverage                  | `bun run test:coverage`         |
| Install the browser for browser tests                | `bun run test:browser:install`  |
| Run desktop and mobile browser tests                 | `bun run test:browser`          |
| Check lint rules                                     | `bun run lint`                  |
| Apply safe lint fixes                                | `bun run lint:fix`              |
| Format source, tests, root configuration, and README | `bun run format`                |
| Check formatting without changes                     | `bun run format:check`          |

Open [localhost:3000](http://localhost:3000) after starting the development server.

Browser tests use Playwright Test 1.64.1 and Chromium. The test command starts a separate local server on port 3100.
Browser downloads stay in `.bun-cache/playwright`. Test traces and screenshots stay in `.bun-tmp/playwright-results`.
Happy DOM tests verify component behavior. Browser tests verify selected navigation, keyboard, and layout behavior.
These tests do not verify provider data or establish full accessibility conformance.

## Development tools

Bun provides type checking, formatting, and unit-test coverage. TypeScript 7.0.2 matches the selected Bun version for editor support.
Oxlint remains necessary because [Bun's native linter](https://bun.com/docs/lint) is canary-only in Bun 1.4.4.

Formatting uses two spaces, semicolons, single quotes, and a 100-character print width. Import sorting is disabled.
The formatter excludes generated routes and agent configuration directories. Review context documents separately.
Coverage remains optional and has no percentage threshold. The coverage command prints a text report without creating coverage files.

New dependency resolution requires a minimum release age of three days through `bunfig.toml`.
Existing versions in `bun.lock` remain unchanged. Use exact-version exceptions only for reviewed urgent updates.
Keep `bun install --frozen-lockfile` for reproducible installs. Bun's default request retries need no additional configuration.
