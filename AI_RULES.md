# Dyad Repository Guidance

Dyad is an Electron desktop application with distinct main, preload, and renderer processes. This is the root Dyad app—not the generated/scaffolded apps it can create. Keep changes within the existing architecture and use `AGENTS.md` plus the relevant `rules/` documents for detailed IPC, database, state, security, and testing guidance.

## Tech stack

- Electron 40, Electron Forge, Vite 5, and Node.js (`>=24 <26`) power the desktop runtime and builds.
- React 19 and TypeScript are used for the renderer and typed application code.
- TanStack Router handles renderer navigation; do not introduce React Router or a web-framework routing model.
- Tailwind CSS 4 styles the UI; existing `@base-ui/react` wrappers provide UI primitives, and `lucide-react` provides icons. Use Base UI, not Radix UI.
- TanStack Query manages IPC-backed persisted data; Jotai manages client-side UI state.
- Drizzle ORM and `better-sqlite3` provide typed access to the local SQLite database.
- Vercel AI SDK and its provider adapters power model integrations; MCP SDKs support tool integrations, and Zod validates data at boundaries.
- Monaco is used for code editing, Lexical for rich chat input, and the Markdown ecosystem (`react-markdown`, `remark-gfm`, Shiki) for rendered content.
- Vitest and Testing Library cover unit/integration tests; Playwright covers Electron E2E, Storybook documents UI components, and oxlint/oxfmt provide linting/formatting.

## Library and boundary rules

- Use TanStack Router for routes, TanStack Query for persisted data fetched or changed over IPC, and Jotai for ephemeral renderer/UI state. Do not duplicate server-owned persisted state in Jotai.
- Use existing typed, validated IPC contracts for renderer-to-main communication. Keep privileged operations and secrets out of the renderer; preserve the main/preload/renderer security boundary.
- Use Drizzle for local database access and schema work; follow `rules/database-drizzle.md` for migrations. Coordinate shared mutations with appId scoping and locks as applicable; see `rules/app-operation-coordination.md`.
- Use the existing AI SDK/provider adapters for model APIs, MCP libraries for MCP integrations, and Zod for validation at external or user-controlled input boundaries.
- Use existing Base UI wrappers for interactive primitives, Tailwind utilities for styling, and the established Monaco, Lexical, and Markdown components for their respective editing/rendering needs rather than introducing competing libraries.
- Choose Vitest/Testing Library for focused unit and renderer/integration coverage, Playwright for behavior requiring the packaged Electron/browser environment, and Storybook for component examples. Follow `AGENTS.md` and relevant `rules/` for exact workflows.
