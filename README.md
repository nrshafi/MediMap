# MediMap

MediMap is a diagnostic-service discovery and price-comparison project for Dhaka, Bangladesh.
The home page has a static "Coming soon" page. The `/discovery` route demonstrates search with unverified sample data.

Built with React, TypeScript, TanStack Start, and Vite.

## Prerequisites

Install stable [Bun](https://bun.com/docs/installation) 1.4.3 or later.

## Commands

| Task | Command |
| --- | --- |
| Install dependencies | `bun install --frozen-lockfile` |
| Start the development server | `bun run dev` |
| Create a production build | `bun run build` |
| Check types | `bun run typecheck` |
| Run unit and component tests | `bun test` |
| Install the browser for browser tests | `bun run test:browser:install` |
| Run desktop and mobile browser tests | `bun run test:browser` |
| Check lint rules | `bun run lint` |
| Apply safe lint fixes | `bun run lint:fix` |

Open [localhost:3000](http://localhost:3000) after starting the development server.

Browser tests use Playwright Test 1.64.1 and Chromium. The test command starts a separate local server on port 3100.
Browser downloads stay in `.bun-cache/playwright`. Test traces and screenshots stay in `.bun-tmp/playwright-results`.
Happy DOM tests verify component behavior. Browser tests verify selected navigation, keyboard, and layout behavior.
These tests do not verify provider data or establish full accessibility conformance.
