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

## Setup

```sh
bun install
```

## Usage

```sh
bun start
```

## Development

```sh
bun run dev      # Watch mode
bun test         # Run tests
bun test:watch   # Watch tests
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
| Enter | Confirm / Process |
| Tab | Switch focus |
| q / Escape | Quit |
