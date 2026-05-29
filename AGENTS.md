# Project Conventions

## Architecture

```
src/
  store/
    types.ts                — AppState, TreeItem, StatusMessage interfaces
    slices/
      scan.ts               — folder scanning, loadFolders, init
      selection.ts          — toggle/selectAll/deselectAll, exports getFoldersToProcess
      batch.ts              — processFolders/unzipSelected/padSelected, batchProcess helper
    handlers/
      keymap.ts             — handleKey(key, ctx) pure function, no React
    index.ts                — compose slices + navigation/rename actions
  components/
    Header.tsx              — title + baseDir display
    HelpModal.tsx           — keyboard shortcuts reference (replaces tree view when toggled)
    ChangeDirPrompt.tsx     — directory browser with subdir list and content indicators
    TreeView.tsx            — subscribes to focusIndex, passes isFocused as prop per row
    TreeItemRow.tsx         — memo'd, receives isFocused as prop (no store subscription)
    InfoMessage.tsx         — static folder/zip counts + navigation hints (returns null when no results)
    StatusBar.tsx           — colored status messages by type (returns null when empty)
    ErrorBoundary.tsx       — class component, catches React errors
    RenamePrompt.tsx        — rename input modal (exports handleRenameSubmit, makeOnSubmit)
  utils/
    colors.ts               — centralized color constants by usage key
    i18n.ts                 — i18next init + t() export
    epub.ts, fs.ts, pad.ts, zip.ts  — pure functions, no store imports
  locales/
    en.json                 — all UI strings (add locale files for translation)
  app.tsx                   — ~43 lines: mount + keyboard bridge
  index.tsx                 — entry point (render(<App/>))
```

## Dependency direction

`utils/` → nothing (pure functions)
`store/slices/` → `utils/`, `store/types.ts`
`store/index.ts` → `store/slices/*`, `utils/fs.ts`
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
| `isProcessing`, `status`, `progressItems` | Store | Async flow, written by non-React code |
| `changeDirMode`, `showHelp`, `renameMode`, `authorMode`, `showSummary`, `showConfig` | Store | UI toggles written by `keymap.ts` handlers |
| `browseDir`, `browseCursor`, `browseItems` | Store | Single-consumer but written by key handlers |
| `outputFormat` | Store | Persisted to config, read by batch process |
| `summaryResults` + friends | Store | Produced by async flow, consumed by overlay |

## Key commands

| Command | What |
|---------|------|
| `bun start [dir]` | Run app |
| `bun run dev` | Watch mode |
| `bun test` | Run all tests |
| `bun test <path>` | Single test file |
| `bun test --coverage` | Coverage report |
| `bun test:coverage` | Coverage report + 95% threshold check |
| `bun run lint` | Typecheck (`tsc --noEmit`) |

Run `lint -> test` before committing (`lint` runs `tsc --noEmit && eslint src/ tests/`). Coverage threshold: per-file ≥95% Funcs + Lines (configured in `bunfig.toml`).

## Zustand patterns

- Store composed via `StateCreator<AppState, [], [], Pick<AppState, ...>>` — Zustand v5 requires 3rd `_store` param
- Components use `useStore(selector)` for field-level subscription
- `useStore.getState()` / `useStore.setState()` for synchronous access outside React (keymap, tests)
- Async actions use `set()` before/after await; no `useEffect` for side effects in store
- Navigation and rename actions live in `store/index.ts` compose function, not in slices

## Component patterns

- Presentational only — no business logic in JSX
- `flexShrink={0}` on Header/InfoMessage/StatusBar to prevent compression in small terminals
- `memo` on list items with `isFocused` passed as prop (never subscribe to `focusIndex` per row)
- InfoMessage and StatusBar return `null` when they have nothing to display

## Component-boundary handler extraction

Extract business logic from component event handlers into exported pure functions + adapter factories.
This makes the logic testable without rendering.

Pattern:
```typescript
// Pure logic — tested directly
export function handleXxxSubmit(value: string, action: (v: string) => void, fallback: () => void): void {
  const val = value.trim();
  if (val) {action(val);}
  else {fallback();}
}

// Adapter — matches OpenTUI's intersection type, testable by calling its return value
export function makeXxxOnSubmit(action: (v: string) => void, fallback: () => void): ((event: object) => void) & ((value: string) => void) {
  return ((value: string) => {
    handleXxxSubmit(value, action, fallback);
  }) as unknown as ((event: object) => void) & ((value: string) => void);
}
```

`RenamePrompt.tsx` → `handleRenameSubmit`, `makeOnSubmit`.

## Unicode gotchas

- **Never use `\u00B7` (middle dot `·`)** as raw JSX text — it renders as the literal characters `\u00B7` because JSX text nodes don't process Unicode escape sequences. Use `\u2022` (bullet `•`) instead, or `{'\u00B7'}` / `{'\u2022'}` when the escape sequence must be evaluated as a JavaScript string expression rather than raw text. Tests must assert the correct character.

## i18n

- All user-facing strings in `src/locales/en.json`
- Import `t` from `@utils/i18n`, call `t("domain.key", { optInterpolation })`
- Plural forms: `key_zero`, `key_one`, `key_other` (e.g. `selection.item` → "0/1/5 item(s)...")
- Interpolation: `t("batch.progress", { current, total, name })`
- Add a locale: create `fr.json`, add to `i18n.ts` resources

## Keyboard handling

- `store/handlers/keymap.ts` exports `handleKey(key, ctx)` — pure function
- Context includes `{ renderer, isProcessing, changeDirMode, renameMode, showHelp, itemsLength, focusIndex, getState, setState }`
- Escape closes change-dir prompt or help modal; Escape outside those modes quits

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
- Handler tests (handleRenameSubmit, handleChangeDirSubmit, makeOnSubmit) test exported pure functions directly
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
