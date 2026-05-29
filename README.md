# Images to EPUB Converter (Bun + OpenTUI)

A terminal-based application that converts folders of images (`.webp`, `.jpg`, `.jpeg`, `.png`) into EPUB/KEPUB files.

## Features

- **Terminal User Interface**: Interactive TUI using OpenTUI with keyboard navigation
- **Folder Tree View**: Browse and select folders containing images
- **Multiple Selection**: Select/deselect multiple folders with checkboxes
- **ZIP Extraction**: Extract ZIP files before processing
- **Filename Padding**: Zero-pad numeric prefixes in image filenames
- **Author Detection**: Extract author from folder names using `###` delimiter (e.g. `Comic ### Author Name`)
- **Batch Author Set**: Set author metadata on multiple folders at once via `m` key
- **Parallel Processing**: Process multiple folders concurrently with live progress dashboard
- **Post-batch Summary**: Result overlay after batch completes
- **Output Format Toggle**: Switch between epub, kepub, or both via `f` key
- **Config Persistence**: `~/.img2epubrc` config file with CLI flag overrides
- **Directory Browser**: Browse filesystem to change scan directory
- **Rename Folders**: Rename folders in-place via `n` key
- **Corrupt Image Handling**: Skips corrupt images and continues processing
- **Progress Tracking**: Real-time multi-row progress dashboard during batch processing

## Requirements

- [Bun](https://bun.sh/) 1.0+
- macOS / Linux (OpenTUI requires a POSIX terminal)

## Setup

```sh
bun install
```

## Usage

```sh
bun start                    # Scans ~/Downloads by default
bun start /path/to/images    # Start with a specific directory
bun start --format kepub ./scans  # With CLI flags
```

For quick access from anywhere, add this alias to `~/.zshrc`:

```sh
alias img2epub='cd "/path/to/images_to_epub" && bun start'
```

Or run the setup script from the project root:

```sh
bash scripts/setup-alias.sh            # alias named 'img2epub'
bash scripts/setup-alias.sh myalias    # custom alias name
```

Then run `img2epub` or `img2epub /path/to/images` from any directory.

### CLI Flags

| Flag | Description |
|------|-------------|
| `--output-dir, -o` | Output directory (default: ~/Downloads) |
| `--format, -f` | Output format: epub, kepub, both |
| `--parallel, -p` | Parallelism factor |
| `--skip-existing` | Skip if output file exists |
| `--config` | Path to custom config file |
| `--no-config` | Ignore config file |
| `--init-config` | Write default config and exit |

The app opens a terminal interface showing the folder tree. Press `Space` to toggle items, `Enter` to process, `c` to change directory, and `h` for help.

## Development

```sh
bun run dev       # Watch mode
bun test          # Run tests
bun test:coverage # Coverage report (lcov)
bun run lint      # Typecheck + ESLint
bun run lint:eslint # ESLint only
```

## Project Structure

```
src/
  index.tsx            # Entry point: CLI arg parsing, config init, renderer
  app.tsx              # Mount + keyboard bridge + modal routing (~58 lines)
  store/
    types.ts           # AppState, TreeItem, StatusMessage, ProgressItem
    constants.ts       # ID_PREFIXES for folder/zip IDs
    index.ts           # Composed Zustand store
    slices/
      scan.ts          # Folder scanning and loading
      selection.ts     # Item selection logic
      batch.ts         # Batch processing (EPUB, unzip, pad) with parallel worker pool
      navigation.ts    # Change dir, directory browser, help/config toggles
      rename.ts        # Rename folder on disk
      author.ts        # Batch-set author on folders
      summary.ts       # Post-batch summary overlay state
    handlers/
      keymap.ts        # Keyboard handler (pure function)
  components/
    Header.tsx         # App header with title + output + path
    HelpModal.tsx      # Keyboard shortcuts reference
    ConfigModal.tsx    # Config overview modal
    ChangeDirPrompt.tsx# Directory browser
    InputPrompt.tsx    # Reusable input prompt
    RenamePrompt.tsx   # Rename input modal
    AuthorPrompt.tsx   # Batch author input modal
    TreeView.tsx       # Scrollable folder tree
    TreeItemRow.tsx    # Single tree row (memo'd)
    InfoMessage.tsx    # Status messages
    ProgressDashboard.tsx # Multi-row progress bars during batch
    SummaryOverlay.tsx # Post-batch summary overlay
    ErrorBoundary.tsx  # Error boundary
  utils/
    colors.ts          # Color constants
    config.ts          # Config file read/write, CLI arg parsing
    fs.ts              # Folder scanning, zip discovery, hierarchy
    i18n.ts            # i18next setup
    pad.ts             # Numeric filename padding
    zip.ts             # ZIP extraction
    epub.ts            # EPUB generation with sharp + jszip
  locales/
    en.json            # All UI strings
tests/
  fs.test.ts           # File system utility tests
  pad.test.ts          # Filename padding tests
  epub.test.ts         # EPUB generation tests
  zip.test.ts          # ZIP extraction tests
  keymap.test.ts       # Keyboard handler tests
  batch.test.ts        # Batch processing tests
  store.test.ts        # Store action tests
  render.test.tsx      # Render/snapshot tests
```

## Supported Image Formats

- `.webp`
- `.jpg` / `.jpeg`
- `.png`

## Output

- EPUB/KEPUB files saved to configurable output directory (default: `~/Downloads`)
- First image used as cover
- All images converted to JPEG
- Configurable output format: epub, kepub, or both

## Keyboard Controls

| Key | Action |
|-----|--------|
| ↑ / ↓ | Navigate items |
| Space | Toggle checkbox |
| a | Select All |
| d | Deselect All |
| Enter | Process selected folders |
| Shift+Enter | Process selected folders (sequential) |
| p | Pad filenames |
| u | Unzip selected |
| c | Change directory |
| r | Refresh folders |
| n | Rename focused folder |
| m | Batch-set author on selected folders |
| f | Cycle output format (epub ↔ both ↔ kepub) |
| h | Toggle help |
| ` | Toggle config overview |
| q / Escape | Quit |

## Tech Stack

| Purpose | Library |
|---------|---------|
| EPUB assembly | Manual EPUB 3 via `jszip` |
| Image processing | `sharp` |
| Terminal UI | `@opentui/react` |
| ZIP extraction | `yauzl` |
| State management | `zustand` |
| i18n | `i18next` |

## License

MIT
