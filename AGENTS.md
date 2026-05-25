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
    index.ts                — compose slices + navigation state/actions (toggleHelp, openChangeDir, changeDir, cancelChangeDir, refresh)
  components/
    Header.tsx              — title + baseDir display
    HelpModal.tsx           — keyboard shortcuts reference (replaces tree view when toggled)
    ChangeDirPrompt.tsx     — directory input with subdir hints (useState, not useRef)
    TreeView.tsx            — subscribes to focusIndex, passes isFocused as prop per row
    TreeItemRow.tsx         — memo'd, receives isFocused as prop (no store subscription)
    InfoMessage.tsx         — static folder/zip counts + navigation hints (returns null when no results)
    StatusBar.tsx           — colored status messages by type (returns null when empty)
    ErrorBoundary.tsx       — class component, catches React errors
  utils/
    colors.ts               — centralized color constants by usage key
    i18n.ts                 — i18next init + t() export
    epub.ts, fs.ts, pad.ts, zip.ts  — pure functions, no store imports
  locales/
    en.json                 — all UI strings (add locale files for translation)
  app.tsx                   — ~40 lines: mount + keyboard bridge
  index.tsx                 — entry point (render(<App/>))
```

## Dependency direction

`utils/` → nothing (pure functions)
`store/slices/` → `utils/`, `store/types.ts`
`store/index.ts` → `store/slices/*`, `utils/fs.ts`
`components/` → `store/index.ts`, `utils/`
`app.tsx` → everything

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

Run `lint -> test` before committing (`lint` runs `tsc --noEmit && eslint src/ tests/`). Coverage threshold checked via `bun run test:coverage` (≥90% Funcs + Lines, configured in `bunfig.toml`).

## Zustand patterns

- Store composed via `StateCreator<AppState, [], [], Pick<AppState, ...>>`
- Components use `useStore(selector)` for field-level subscription
- `useStore.getState()` / `useStore.setState()` for synchronous access outside React (keymap, tests)
- Async actions use `set()` before/after await; no `useEffect` for side effects in store
- Navigation state (`changeDirMode`, `showHelp`, `subdirs`, `promptKey`) lives in `store/index.ts` compose function, not in slices

## Component patterns

- Presentational only — no business logic
- `flexShrink={0}` on Header/InfoMessage/StatusBar to prevent compression in small terminals
- `memo` on list items with `isFocused` passed as prop (never subscribe to `focusIndex` per row)
- ChangeDirPrompt resets via `key={promptKey}` remount (no `useEffect`)
- InfoMessage and StatusBar return `null` when they have nothing to display

## i18n

- All user-facing strings in `src/locales/en.json`
- Import `t` from `../utils/i18n`, call `t("domain.key", { optInterpolation })`
- Plural forms: `key_zero`, `key_one`, `key_other` (e.g. `selection.item` → "0/1/5 item(s)...")
- Interpolation: `t("batch.progress", { current, total, name })`
- Add a locale: create `fr.json`, add to `i18n.ts` resources

## Keyboard handling

- `store/handlers/keymap.ts` exports `handleKey(key, ctx)` — pure function
- Context (renderer, isProcessing, changeDirMode, showHelp, focusIndex, itemsLength) passed from app.tsx
- Escape closes change-dir prompt or help modal; Escape outside those modes quits

## TypeScript and toolchain

- `target: ES2024`, `jsxImportSource: "@opentui/react"` (not standard React)
- No `any` in meaningful code
- `import type` for type-only imports
- OpenTUI elements: `text`, `box`, `scrollbox`, `input`, `span`, `u`, `br`
- `resolveJsonModule: true` — JSON imports work without `assert`

## Testing

- Runner: `bun:test` (describe, it, expect)
- 56 tests across 7 files
- Use `toEqual()` on the **full return value** of functions to detect interface changes — if a field is added/removed/renamed on the return type, the test fails immediately
- For dynamic fields (error messages, file paths), use matchers like `expect.stringContaining(...)`, `expect.stringMatching(/.../)`, `expect.arrayContaining([...])`, or `expect.any(Type)` inside `toEqual()`
- For complex nested returns, split into multiple `toEqual()` assertions per sub-object rather than one monolithic call — the goal is still full-shape coverage, not single-line brevity
- Keymap tests use `useStore.getState()`/`setState()` directly — no React rendering
- Render tests use OpenTUI's `testRender` + `captureCharFrame` from `@opentui/react/test-utils`
- Zip tests create real zip files via JSZip + write to temp dirs
- Line coverage >97%, Function coverage 100%
- `bun run test:coverage` enforces ≥90% Funcs and Lines (configured in `bunfig.toml`, exits non-zero if below)

## Git conventions

- Conventional Commits: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `style`
- One feature per branch, squash before merge
- e.g. `feat(i18n): plural forms, zero handling, and interpolation in translations`

## Tooling

- Use `context7` MCP tools for documentation lookups (configured in `opencode.json`)
- `opencode-yaml-hooks` plugin fires `scripts/session-end.sh` on `session.deleted`:

## Color conventions

All colors defined in `src/utils/colors.ts` with named usage keys:
- `title`, `path`, `keyHighlight`, `controlsText`, `countHighlight`, `dim`, `inputBg`, `inputText`, `subdirName`, `errorMessage`
- Status: `statusInfo`, `statusProgress`, `statusError`, `statusDone`
- Tree items: `treeItemNormal`, `treeItemZip`, `treeItemFocus`
