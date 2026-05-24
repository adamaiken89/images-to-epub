# Images to EPUB Converter (Bun + OpenTUI)

A terminal-based application that converts folders of images (`.webp`, `.jpg`, `.jpeg`, `.png`) into EPUB files.

## Features

- **Terminal User Interface**: Interactive TUI using OpenTUI with keyboard navigation
- **Folder Tree View**: Browse and select folders containing images
- **Multiple Selection**: Select/deselect multiple folders with checkboxes
- **ZIP Extraction**: Extract ZIP files before processing
- **Filename Padding**: Zero-pad numeric prefixes in image filenames
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

The app opens a terminal interface showing the folder tree. Press `Space` to toggle items, `Enter` or `p` to process, and `c` to change the scanned directory.

## Development

```sh
bun run dev      # Watch mode
bun test         # Run tests
bun test:watch   # Watch tests
bun test --coverage  # Run tests with coverage report
```

## Project Structure

```
src/
  index.tsx          # Entry point - OpenTUI renderer setup
  app.tsx            # Main TUI component with keyboard handling
  utils/
    fs.ts            # Folder scanning, zip discovery, hierarchy
    pad.ts           # Numeric filename padding
    zip.ts           # ZIP extraction
    epub.ts          # EPUB generation with sharp + jszip
tests/
  fs.test.ts         # File system utility tests
  pad.test.ts        # Filename padding tests
  epub.test.ts       # EPUB generation tests
  zip.test.ts        # ZIP extraction tests
legacy/
  src/               # Original Python implementation
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
| Enter | Process selected folders |
| a | Select All |
| d | Deselect All |
| p | Process EPUBs |
| u | Unzip selected |
| z | Pad filenames |
| c | Change directory |
| r | Refresh folders |
| h / ? | Toggle help |
| q / Escape | Quit |

## Test Coverage

```
All files          | 100.00% Funcs | 97.15% Lines
src/utils/epub.ts  | 100.00% Funcs | 97.54% Lines
src/utils/fs.ts    | 100.00% Funcs | 97.22% Lines
src/utils/pad.ts   | 100.00% Funcs | 93.85% Lines
src/utils/zip.ts   | 100.00% Funcs | 100.00% Lines
```

Run `bun test --coverage` to see the latest report.

## Migration Notes

This project was migrated from Python (Tkinter + ebooklib + Pillow) to Bun + OpenTUI:

| Python | JS Replacement |
|--------|---------------|
| `ebooklib` | Manual EPUB 3 assembly via `jszip` |
| `Pillow` | `sharp` (native image processing) |
| `tkinter` | `@opentui/react` (terminal UI) |
| `zipfile` | `extract-zip` / `jszip` |

## License

MIT
