# Project Conventions

## Architecture

```
src/
  store/
    types.ts                — AppState, TreeItem, StatusMessage interfaces
    slices/
      scan.ts               — StateCreator<AppState, [], [], Pick<AppState, ...>>
      selection.ts           — StateCreator<...>, exports getFoldersToProcess
      batch.ts               — StateCreator<...>, batchProcess helper
    handlers/
      keymap.ts              — handleKey pure function
    index.ts                 — compose slices + navigation state/actions
  components/
    Header.tsx               — presentational, uses useStore selectors
    ControlsHint.tsx
    ChangeDirPrompt.tsx      — uncontrolled via useRef, no store writes per keystroke
    TreeView.tsx             — subscribes to focusIndex, passes isFocused as prop
    TreeItemRow.tsx          — memo'd, receives isFocused as prop (no store subscription)
    InfoMessage.tsx
    StatusBar.tsx
    ErrorBoundary.tsx        — class component
  utils/
    epub.ts, fs.ts, pad.ts, zip.ts  — pure functions, no store imports
  app.tsx                   — ~40 lines: mount + keyboard bridge
  index.tsx                 — entry point
```

## Dependency direction

`utils/` → nothing (pure functions)
`store/slices/` → `utils/`, `store/types.ts`
`store/index.ts` → `store/slices/*`
`components/` → `store/index.ts`
`app.tsx` → everything

## Zustand patterns

- Single store composed via `StateCreator<AppState, [], [], Pick<AppState, ...>>`
- Actions use `set()` and `get()` from the slice creator
- Components use `useStore(selector)` for field-level subscription
- `useStore.getState()` for synchronous reads outside React (keymap, tests)
- Async actions use `set()` before/after await

## Component patterns

- Presentational components only — no business logic
- Each component subscribes to its minimum needed slices via selectors
- Use `memo` on list item components with `isFocused` passed as prop (never subscribe to `focusIndex` per row)
- Uncontrolled inputs use `useRef` — read `inputRef.current?.value` on submit only

## Keyboard handling

- `store/handlers/keymap.ts` exports `handleKey(key, ctx)` — pure function, no React
- Keymap reads store via `useStore.getState()` and writes via `useStore.setState()`
- Context (renderer, isProcessing, changeDirMode, focusIndex, itemsLength) passed in from app.tsx

## Testing

- Runner: `bun test`
- Test framework: `bun:test` (describe, it, expect)
- 40+ tests across 5 files
- Keymap tests use `useStore.getState()`/`setState()` directly — no React rendering
- Zip tests create real zip files via JSZip + write to temp dirs
- Summary count: Line coverage >97%, Function coverage 100%

## TypeScript

- No `any` in meaningful code (only `as any` for Zustand StateCreator workaround in batch slice)
- `const` assertions on string literals
- `import type` for type-only imports
- OpenTUI components: `text`, `box`, `scrollbox`, `input`, `span`, `u`, `br`

## Color conventions

- Title: `#66ccff` bold
- Directory path: `#aaaaaa` underlined with `<u>`
- Controls hint keys: `#ffcc00` inside `<span>`
- Controls hint text: `#88ff88`
- Status info: `#66ccff`
- Status progress: `#ffcc00`
- Status error: `#ff4444`
- Status done: `#66ff66`
- Info message numbers: `#ffcc00`
- Focused row: `#ffffff` on `#3366cc` background
- Tree item (normal): `#cccccc`
- Zip item: `#888888`
- Select All header: `#66ccff` bold
