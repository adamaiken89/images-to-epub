# Project Conventions

When you need to search docs, use `context7` MCP tools.

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

Define whether state belongs in the Zustand store or in React hooks (useState/useEffect):

**Zustand store** — when ANY of:
1. **Multi-consumer**: read/written by ≥2 independent parts (components, key handlers, store slices)
2. **Non-React writes**: modified by keyboard handlers (`handleKey`) or async flows outside React's lifecycle
3. **Persistence needed**: must survive component unmount/remount
4. **Business domain data**: folders, selections, processing status

**React hooks** — when ALL of:
1. **Single consumer**: used by exactly one component subtree
2. **Ephemeral**: resets naturally on unmount
3. **UI mechanics only**: remount keys, local data fetching, no business logic
4. **No handler dependency**: not written by keyboard handlers or other non-React code

Current state allocation:

| State | Home | Reason |
|---|---|---|
| `baseDir`, `items`, `selectedIds`, `focusIndex` | Store | Multi-consumer, business data |
| `isProcessing`, `status` | Store | Multi-consumer, async flows |
| `changeDirMode`, `showHelp`, `renameMode`, `renameTarget` | Store | Written by key handlers, read by app.tsx + other components |
| `subdirs` | `useState` in ChangeDirPrompt | Single consumer, fetched on mount via `useEffect` |
| `promptKey`, `renameKey` | Removed | Were UI mechanics (remount counters), unnecessary since store refs are stable |

## Key commands

| Command | What |
|---------|------|
| `bun start [dir]` | Run app |
| `bun run dev` | Watch mode |
| `bun test` | Run all tests |
| `bun test <path>` | Single test file |
| `bun test --coverage` | Coverage report |
| `bun test:coverage` | Coverage report + 90% threshold check |
| `bun run lint` | Typecheck (`tsc --noEmit`) |

Run `lint -> test` before committing (`lint` runs `tsc --noEmit && eslint src/ tests/`). Coverage threshold: per-file ≥90% Funcs + Lines (configured in `bunfig.toml`).

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
- Component-scoped `useEffect` for local data fetching (e.g., ChangeDirPrompt fetches subdirs)

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
- No `any` in meaningful code
- `import type` for type-only imports
- OpenTUI elements: `text`, `box`, `scrollbox`, `input`, `span`, `u`, `br`
- `resolveJsonModule: true` — JSON imports work without `assert`
- Path aliases: `@/*` → `src/*`, `@components/*` → `src/components/*`, `@utils/*` → `src/utils/*`, `@store` → `src/store/index.ts`, `@store/*` → `src/store/*`, `@tests/*` → `tests/*`
- ESLint: `no-restricted-imports` bans parent-relative (`../**`, `../../**`)

## Testing

- Runner: `bun:test` (describe, it, expect)
- Use `toEqual()` on the **full return value** of functions to detect interface changes — if a field is added/removed/renamed on the return type, the test fails immediately
- For dynamic fields (error messages, file paths), use matchers like `expect.stringContaining(...)`, `expect.stringMatching(/.../)`, `expect.arrayContaining([...])`, or `expect.any(Type)` inside `toEqual()`
- For complex nested returns, split into multiple `toEqual()` assertions per sub-object rather than one monolithic call
- Keymap tests use `useStore.getState()`/`setState()` directly — no React rendering
- Render tests use OpenTUI's `testRender` + `captureCharFrame` from `@opentui/react/test-utils`
- Render tests focus on state→UI mapping (set store state, render, assert frame) — keyboard→state integration is tested in keymap tests
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
