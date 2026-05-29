# Images to EPUB Converter (Bun + OpenTUI)

A terminal-based application that converts folders of images (`.webp`, `.jpg`, `.jpeg`, `.png`) into EPUB files.

## Features

- **Terminal User Interface**: Interactive TUI using OpenTUI with keyboard navigation
- **Folder Tree View**: Browse and select folders containing images
- **Multiple Selection**: Select/deselect multiple folders with checkboxes
- **ZIP Extraction**: Extract ZIP files before processing
- **Filename Padding**: Zero-pad numeric prefixes in image filenames
- **Author Detection**: Extract author from folder names using `###` delimiter (e.g. `Comic ### Author Name`)
- **Progress Tracking**: Real-time processing status
- **Keyboard Controls**: Arrow keys to navigate, Space to toggle, Enter to confirm

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

The app opens a terminal interface showing the folder tree. Press `Space` to toggle items, `Enter` or `p` to process, and `c` to change the scanned directory.

## Development

```sh
bun run dev      # Watch mode
bun test         # Run tests
bun test:coverage # Coverage report + 95% threshold check
bun test --coverage  # Run tests with coverage report
```

## Project Structure

```
src/
  index.tsx            # Entry point - OpenTUI renderer setup
  app.tsx              # Mount + keyboard bridge (~40 lines)
  store/
    types.ts           # AppState, TreeItem, StatusMessage interfaces
    index.ts           # Composed Zustand store
    slices/
      scan.ts          # Folder scanning and loading
      selection.ts     # Item selection logic
      batch.ts         # Batch processing (EPUB, unzip, pad)
    handlers/
      keymap.ts        # Keyboard handler (pure function)
  components/
    Header.tsx         # App header with title
    ControlsHint.tsx   # Keyboard shortcuts display
    ChangeDirPrompt.tsx # Directory change input
    TreeView.tsx       # Scrollable folder tree
    TreeItemRow.tsx    # Single tree row (memo'd)
    InfoMessage.tsx    # Status messages
    StatusBar.tsx      # Footer with colored status
    ErrorBoundary.tsx  # Error boundary
  utils/
    colors.ts          # Color constants
    fs.ts              # Folder scanning, zip discovery, hierarchy
    pad.ts             # Numeric filename padding
    zip.ts             # ZIP extraction
    epub.ts            # EPUB generation with sharp + jszip
tests/
  fs.test.ts           # File system utility tests
  pad.test.ts          # Filename padding tests
  epub.test.ts         # EPUB generation tests
  zip.test.ts          # ZIP extraction tests
  keymap.test.ts       # Keyboard handler tests
```

## Supported Image Formats

- `.webp`
- `.jpg` / `.jpeg`
- `.png`

## Output

- EPUB files saved to `~/Downloads`
- First image used as cover
- All images converted to JPEG

## Keyboard Controls

| Key | Action |
|-----|--------|
| ↑ / ↓ | Navigate items |
| Space | Toggle checkbox |
| a | Select All |
| d | Deselect All |
| Enter / p | Process selected folders (EPUB) |
| u | Unzip selected |
| z | Pad filenames |
| c | Change directory |
| r | Refresh folders |
| q / Escape | Quit |

## Test Coverage

```
All files          |   86.75% Funcs |   84.77% Lines
src/utils/colors.ts|  100.00% Funcs |  100.00% Lines
src/utils/epub.ts  |  100.00% Funcs |   97.66% Lines
src/utils/fs.ts    |   84.21% Funcs |   92.00% Lines
src/utils/pad.ts   |  100.00% Funcs |   95.16% Lines
src/utils/zip.ts   |   95.24% Funcs |   90.30% Lines
```

Run `bun test --coverage` to see the latest report.

## Tech Stack

| Purpose | Library |
|---------|---------|
| EPUB assembly | Manual EPUB 3 via `jszip` |
| Image processing | `sharp` |
| Terminal UI | `@opentui/react` |
| ZIP extraction | `yauzl` |
| State management | `zustand` |

## License

MIT
