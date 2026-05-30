# Project Conventions

## Architecture

```
src/
  store/
    types.ts                — AppState, TreeItem, StatusMessage, ProgressItem interfaces
    constants.ts            — ID_PREFIXES for folder/zip IDs
    slices/
      scan.ts               — folder scanning, loadFolders, init
      selection.ts          — toggle/selectAll/deselectAll, exports getFoldersToProcess
      batch.ts              — processFolders/unzipSelected/padSelected, delegates execution to runWorkerPool
      navigation.ts         — change dir, directory browser, help/config toggles, refresh
      rename.ts             — rename folder on disk
      author.ts             — batch-set author on folders via `###` delimiter
      summary.ts            — post-batch summary modal state
    handlers/
      keymap.ts             — handleKey(key, ctx) pure function, no React
    index.ts                — compose all slices + setOutputFormat
  components/
    Header.tsx              — title + output + path display
    HelpModal.tsx           — keyboard shortcuts reference (replaces tree view when toggled)
    ConfigModal.tsx         — config overview modal
    ChangeDirPrompt.tsx     — directory browser with subdir list and content indicators
    InputPrompt.tsx         — reusable input prompt (used by RenamePrompt + AuthorPrompt)
    RenamePrompt.tsx        — rename input prompt (exports handleRenameSubmit, makeOnSubmit)
    AuthorPrompt.tsx        — batch author input prompt (exports handleAuthorSubmit, makeAuthorOnSubmit)
    TreeView.tsx            — subscribes to focusIndex, passes isFocused as prop per row
    TreeItemRow.tsx         — memo'd, receives isFocused as prop (no store subscription)
    InfoMessage.tsx         — static folder/zip counts + navigation hints (returns null when no results)
    ProgressDashboard.tsx   — multi-row live progress bars during batch processing
    SummaryModal.tsx      — post-batch summary modal (backdrop over tree)
    ErrorBoundary.tsx       — class component, catches React errors
    utils/
      colors.ts               — centralized color constants by usage key
      i18n.ts                 — i18next init + t() export
      config.ts               — config file (~/.img2epubrc) read/write, CLI arg parsing
      epub.ts, fs.ts, pad.ts, zip.ts, worker-pool.ts  — pure functions, no store imports
  locales/
    en.json                 — all UI strings (add locale files for translation)
  app.tsx                   — ~58 lines: mount + keyboard bridge + modal routing
  index.tsx                 — entry point: parse CLI args, init config, create renderer
```

## Dependency direction

`utils/` → nothing (pure functions)
`store/slices/` → `utils/`, `store/types.ts`, `store/constants.ts`
`store/index.ts` → `store/slices/*`, `utils/config.ts`
`components/` → `store/index.ts`, `utils/`
`store/handlers/` → nothing (pure functions, no store import)
`app.tsx` → everything

## State boundary: Zustand store vs React hooks

**Zustand store** — all state in this project lives in the store. Even single-consumer UI state (modals, browse-prompt directory listing) is stored here because it must be read/written by keyboard handlers (`keymap.ts`) which use `useStore.getState()` / `useStore.setState()` synchronously.

**React hooks** — only `ErrorBoundary` class `this.state` (inherent to the error boundary pattern — class components can't use stores). No `useState` or `useRef` elsewhere.

Current state allocation:

| State group | Home | Why store |
|---|---|---|
| `baseDir`, `items`, `selectedIds`, `focusIndex` | Store | Business domain, multi-consumer |
| `isProcessing`, `status`, `progressItems`, `batchStartTime`, `batchEndTime`, `processingMode` | Store | Async flow, written by non-React code |
| `changeDirMode`, `showHelp`, `showConfig`, `renameMode`, `renameTarget`, `authorMode`, `showSummary` | Store | UI toggles written by `keymap.ts` handlers. Prompts use `*Mode` (inline inputs), modals use `show*` (full-height overlays). |
| `browser` (`dir`, `cursor`, `items`, `setDir`, `confirm`) | Store | Single-consumer but written by key handlers; grouped as sub-object |
| `outputFormat` | Store | Persisted to config, read by batch process |
| `summary` (`results`, `totalPages`, `totalSize`, `elapsed`, `successCount`, `failCount`) | Store | Produced by async flow, consumed by overlay; grouped as sub-object |

## Key commands

| Command | What |
|---------|------|
| `bun start [dir]` | Run app |
| `bun start --format kepub ./scans` | With CLI flags |
| `bun run dev` | Watch mode |
| `bun test` | Run all tests |
| `bun test <path>` | Single test file |
| `bun test --coverage` | Coverage report |
| `bun test:coverage` | Coverage report (lcov) |
| `bun run lint` | Typecheck + ESLint |
| `bun run lint:eslint` | ESLint only |
| `bun run knip` | Dead code analysis |
| `bun run format` | Format code with Prettier |
| `bun run format:check` | Check formatting |

Pre-commit hook runs `lint-staged` (ESLint --fix + Prettier --write on staged files). Coverage threshold: project-wide ≥90% (configured in `bunfig.toml`).

## Zustand patterns

- Store composed via `StateCreator<AppState, [], [], Pick<AppState, ...>>` — Zustand v5 requires 3rd `_store` param
- Components use `useStore(selector)` for field-level subscription
- `useStore.getState()` / `useStore.setState()` for synchronous access outside React (keymap, tests)
- Async actions use `set()` before/after await; no `useEffect` for side effects in store
- Navigation, rename, and author actions live in their own slices, not in `store/index.ts` compose function

## Component patterns

- Presentational only — no business logic in JSX
- `flexShrink={0}` on Header/InfoMessage to prevent compression in small terminals
- `memo` on list items with `isFocused` passed as prop (never subscribe to `focusIndex` per row)
- InfoMessage returns `null` when they have nothing to display

## Unicode gotchas

- **Never use `\u00B7` (middle dot `·`)** as raw JSX text — it renders as the literal characters `\u00B7` because JSX text nodes don't process Unicode escape sequences. Use `{'\u00B7'}` when the escape sequence must be evaluated as a JavaScript string expression. Tests must assert the correct character.

## i18n

- All user-facing strings in `src/locales/en.json`
- Import `t` from `@utils/i18n`, call `t("domain.key", { optInterpolation })`
- Plural forms: `key_zero`, `key_one`, `key_other` (e.g. `selection.item` → "0/1/5 item(s)...")
- Interpolation: `t("batch.progress", { current, total, name })`
- Add a locale: create `fr.json`, add to `i18n.ts` resources

## Inline panel guide

All modals/prompts are inline panels that sit between Header and TreeView (never replace it). Each uses its own store flag and returns `null` when hidden.

- **Outer box:** `border borderColor={colors.keyHighlight} padding={1} marginBottom={1} flexDirection="column"` (no `flexGrow`)
- **Title:** `<text fg={colors.title} attributes={BOLD} marginBottom={1}>`
- **Dismiss / nav hint:** single `<text marginTop={1} fg={colors.dim}>` at the bottom
- **Input prompt (InputPrompt):** must merge `{hint}` and `{escLabel}` into one line with a `{'\u00B7'}` separator
- No `marginTop` on inner container boxes — use `marginBottom` on the preceding title element instead

## Keyboard handling

- `store/handlers/keymap.ts` exports `handleKey(key, ctx)` — pure function
- Context is `{ renderer, getState, setState }` — all other values read from `getState()`
- Each panel is opened by its own key (`c`, `h`, `` ` ``, `n`, `m`) and dismissed by pressing `q`
- Prompts (`*Mode` state keys — rename, author) are also cancellable with `escape` (both `q` and `escape` call the store's `cancel*` method; `q` is consumed by the handler before reaching the input)
- Modals (`show*` state keys — help, config) are dismissed exclusively by `q`; `escape` falls through to the default handler and quits the app
- Summary (`showSummary`) is the only exception — any key press dismisses it

## TypeScript and toolchain

- `target: ES2024`, `jsxImportSource: "@opentui/react"` (not standard React)
- `useUnknownInCatchVariables: true`
- `import type` for type-only imports
- Path aliases: `@/*` → `src/*`, `@components/*` → `src/components/*`, `@utils/*` → `src/utils/*`, `@store` → `src/store/index.ts`, `@store/*` → `src/store/*`, `@tests/*` → `tests/*`
- ESLint: `no-restricted-imports` bans parent-relative (`../**`, `../../**`)

## Testing

- Runner: `bun:test` (describe, it, expect)
- Use `toEqual()` on the **full return value** of functions to detect interface changes — if a field is added/removed/renamed on the return type, the test fails immediately
- For dynamic fields (error messages, file paths), use matchers like `expect.stringContaining(...)`, `expect.stringMatching(/.../)`, `expect.arrayContaining([...])`, or `expect.any(Type)` inside `toEqual()`
- For complex nested returns, split into multiple `toEqual()` assertions per sub-object rather than one monolithic call
- Keymap tests use `useStore.getState()`/`setState()` directly — no React rendering
- Render tests use `render` from `@wyattjoh/opentui-testing` (handles React `act()` wrapping, frame quiescence, and automatic cleanup via `afterEach`)
- Render tests focus on state→UI mapping (set store state, render, assert frame) — keyboard→state integration is tested in keymap tests
- Render tests push each `RenderResult` into a `cleanupQueue` array and call `app.cleanup()` in `afterEach` to destroy the renderer inside `act()`; the queue is cleared after each test
- Handler tests (handleRenameSubmit, handleChangeDirSubmit, makeOnSubmit, handleAuthorSubmit, makeAuthorOnSubmit) test exported pure functions directly
- Store actions tested via `useStore.getState().action()` — no React rendering
- Zip tests create real zip files via JSZip + write to temp dirs

## Git conventions

- Conventional Commits: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `style`
- One feature per branch, squash before merge
- e.g. `feat(i18n): plural forms, zero handling, and interpolation in translations`

## Tooling

- Use `context7` MCP tools for documentation lookups (configured in `opencode.json`)
- `opencode-yaml-hooks` plugin fires `scripts/session-end.sh` on `session.deleted`:
- Pre-commit: `husky` → `lint-staged` runs ESLint --fix + Prettier --write on staged `*.{ts,tsx,json}` files
- `knip` (via `knip-bun`): dead code analysis; run `bun run knip` and address unused exports/types
- `prettier` with `.prettierrc` for consistent formatting; `bun run format` to apply
- `eslint-plugin-simple-import-sort` enforces import/export ordering; auto-fixable with `--fix`
