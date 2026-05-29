# Product Spec: Making img2epub Lovable

> **Status**: Draft v1  
> **Target release**: 3.0.0  
> **Persona**: Manga/comic archivist, scanner enthusiast, Calibre power user

---

## Overview

Make `img2epub` a tool users *look forward* to using — not just tolerate. The four pillars:

| # | Theme | Why it matters |
|---|-------|----------------|
| 1 | Persistent config + reduced friction | Every repetitive prompt or default-override is death by a thousand cuts |
| 2 | Beautiful progress + summary | The processing wait is the longest UX moment — turn it into a dashboard |
| 3 | Graceful edge handling | One corrupt image or 2000-file folder should not break the session |
| 4 | Parallel batch processing | Processing 10 volumes sequentially is painful; 4-at-once is a superpower |

---

## Theme 1: Persistent Config + Reduced Friction

### 1.1 Config file (`~/.img2epubrc`)

```
JSON format, created automatically on first run if missing.
```

```jsonc
{
  "defaultBaseDir": "~/Downloads",          // override default scan directory
  "outputDir": "~/Downloads/img2epub",      // where EPUBs land (default: ~/Downloads)
  "outputFormat": "epub",                   // epub | kepub | both
  "parallelism": 4,                         // max concurrent processes
  "skipExisting": false,                    // skip output if .epub already exists
  "authorDetection": "folder",              // "folder" | "prompt" | "none"
  "imageFormats": [".webp", ".jpg", ".jpeg", ".png"],
  "theme": "default"                        // placeholder for future themes
}
```

### 1.2 Behavior

- **First run**: auto-create `~/.img2epubrc` with defaults, no prompt.
- **CLI overrides**: `--output-dir`, `--format`, `--parallel`, `--skip-existing` — these take precedence over config file for that session only.
- **In-app**: pressing `c` (change dir) now pre-fills the prompt with the config `defaultBaseDir`.
- **Output format**: `f` cycling persists to config so next session remembers.
- **Config reload**: pressing `o` (or new key `C` for config) opens a config overview modal showing current effective settings.

### 1.3 CLI flag spec

```
bun start [dir] [flags]

Flags:
  --output-dir, -o   Output directory (default: config.outputDir)
  --format, -f       Output format: epub, kepub, both (default: config.outputFormat)
  --parallel, -p     Parallelism factor (default: config.parallelism)
  --skip-existing    Skip if output file exists (default: config.skipExisting)
  --config           Path to custom config file (default: ~/.img2epubrc)
  --no-config        Ignore config file, use built-in defaults
  --init-config      Write default config and exit
```

### 1.4 Success criteria

- A user can say `img2epub --format kepub --output-dir ./ebooks ./raw_scans` and have it work immediately, no interaction needed.
- Config changes made via in-app toggles (output format) persist across restarts.
- `--init-config` is a zero-friction onboarding: `img2epub --init-config && vim ~/.img2epubrc`.

---

## Theme 2: Beautiful Progress + Summary

### 2.1 Live per-folder progress bar

Replace the single-line status during batch processing with a **multi-line dashboard**.

**Layout during processing** (bottom portion of screen, above StatusBar):

```
Processing 4 folders (parallel: 4)
─────────────────────────────────────
  Ch.5  [████████░░░░░░░░░░]  14/20 pages  ─ processing
  Vol.3 [████████████░░░░░░]  32/40 pages  ─ processing
  Ch.7  [██████████████████]  18/18 pages  ✓ done
  Ch.9  [░░░░░░░░░░░░░░░░░░]   0/22 pages  ─ queued
─────────────────────────────────────
  Overall: 64/100 pages · 3.2 MB written · 12s elapsed
```

**Implementation notes**:

- Each folder gets its own row. Rows appear as processing begins.
- Bar uses `block` chars (`, ``, `█`, `░`) or Unicode half-blocks for smoothness.
- Row states: `queued` → `processing` (with spinner/animation on label) → `done ✓` / `error ✗`.
- Elapsed time updates every 500ms.
- Rate: show pages/sec or MB/sec after first few seconds.
- When batch completes, transition to summary screen (see 2.2).

### 2.2 Post-batch summary screen

After processing, replace the progress dashboard with a **summary overlay** that Auto-dismisses after 5s or on any key.

```
┌─────────────────────────────────────────────┐
│  Batch Complete                             │
│                                             │
│  ✓ Ch.5         14 pages → Ch.5.epub       │
│  ✓ Vol.3        40 pages → Vol.3.epub       │
│  ✓ Ch.7         18 pages → Ch.7.epub        │
│  ✗ Ch.9         error: corrupt image p.12   │
│                                             │
│  3 of 4 succeeded · 72 pages · 4.1 MB       │
│  Compression ratio: 2.3x                    │
│  Elapsed: 14.2s                             │
│                                             │
│  [Press any key to dismiss]                 │
└─────────────────────────────────────────────┘
```

**Implementation notes**:

- Summary is a bordered overlay drawn on top of the tree.
- Per-file results: name, pages, output filename, status icon.
- Aggregate stats: success rate, total pages, total size, compression ratio, elapsed time.
- A failed item shows the error message inline.
- "Press any key" exits the overlay back to the tree view (with the status bar still showing the last message).

### 2.3 Status bar refinements

- Add elapsed time to the status bar during processing (e.g. `Processing Ch.5... (3.2s)`).
- After summary dismiss, status bar reads: `Last batch: 3/4 succeeded (14.2s)`.

### 2.4 Success criteria

- A user processing 6 manga volumes sees 6 animated progress rows and feels a sense of *momentum*.
- After batch completes, the summary gives immediate satisfaction + actionable error details.
- No flickering or layout shifts during progress updates.

---

## Theme 3: Graceful Edge Handling

### 3.1 Corrupt / unparseable images

**Problem today**: `sharp` throws on corrupt image → the whole batch crashes with uncaught error in the `batchProcess` loop.

**Solution**:

```
catch (err) {
  // skip corrupt image, log error, continue with next image
  errors.push(`${imgPath}: ${err.message}`);
}
```

- In `createEpubFromFolder` (or its caller `batchProcess`), wrap each image conversion in a try/catch.
- If an image fails: log the error, skip that image, continue.
- At the end of the folder: if skipped images > 0, include partial failure in result.
- In the progress dashboard, show a warning count: `⚠ 2 corrupt images skipped`.
- In summary, show per-folder: `Ch.9 (14/16 pages, 2 corrupt images skipped)`.

### 3.2 Large folders (>500 images)

**Problem today**: The tree view loads all folders at once. A folder with 2000 images loads fine. But `organizeFoldersByHierarchy` could be slow for huge directories.

**Solution**:

- **Lazy hierarchy building**: Only expand folders in the tree that are directly visible or navigated into. TUI shows at most ~40 rows at a time anyway. Build the tree incrementally.
- **Progressive scanning indicator**: When a folder takes >1s to scan, show `Scanning... N folders found` in the status bar instead of a blank screen.
- **Display hint**: For folders with >100 images, show page count: `Ch.5 (247 images)` in the tree label.
- **No loading limit**: Never cap or truncate — just make it feel responsive.

### 3.3 Already-processed folders (skip/overwrite/rename)

**Problem today**: Processing the same folder twice creates `folder.epub` and then silently overwrites it.

**Solution**:

- **Pre-flight check**: Before processing, check if output file exists.
- **Config-driven**: `skipExisting: true` (default) → skip with a note in summary: `─ Vol.3  (already exists)`.
- **Override**: `skipExisting: false` → overwrite silently (power user mode).
- **Bulk action**: Hold `shift` + Enter to "force overwrite all" regardless of config.
- **Single-folder**: When processing one folder (Enter on a focused but unchecked item? Or just Enter as today), show brief prompt: `Output exists. [o]verwrite / [s]kip / [a]ll-skip / [esc] cancel`.

### 3.4 Empty folders / no images found

**Problem today**: Selecting a folder with no images gracefully does nothing (no error). That's fine, but user may not understand why.

**Solution**:

- When Enter is pressed and no valid targets exist, show status: `No folders selected with valid images.` (already works via `getFoldersToProcess`).
- In tree view, show `(empty)` dimmed next to folder names that have no images.
- When a parent folder is checked but all its children are empty/excluded, show `Warning: No processable items under "[folder name]"`.

### 3.5 Failure isolation in parallel mode

- If one parallel worker fails, do not cancel other workers.
- Collect errors per-item. Present in summary.
- Worker pool: if a worker's folder fails, the worker picks up the next queued folder immediately.

### 3.6 Success criteria

- A folder with 1 corrupt image out of 200 still produces a valid EPUB with a warning.
- A folder with 2000 images loads and processes without UI freeze.
- Processing the same batch twice (with default config) shows `(already exists)` in summary, no data loss.
- A user can process 10 folders where 2 are bad and get 8 good EPUBs + clear error messages for the 2.

---

## Theme 4: Parallel Batch Processing

### 4.1 Worker pool

**Design**: Fixed-size worker pool using `Promise.all` with a concurrency limit.

```
config.parallelism = min(max(1, userValue), cpus().length)
```

- Default: `min(4, cpu_cores)`.
- Resolved from: CLI flag > config file > OS CPU count.
- Each worker picks next folder from a queue.
- Workers share the same `set()` for progress updates (centralized via Zustand).

### 4.2 Implementation sketch

```
async function processFoldersParallel(targets, parallelism) {
  const queue = [...targets];       // shallow copy
  let completed = 0;
  const results = [];
  const total = queue.length;

  async function worker() {
    while (queue.length > 0) {
      const folder = queue.shift();
      const idx = completed++;
      // update progress dashboard: set folder status to "processing"
      setProgress(idx, folder, "processing");
      try {
        const result = await createEpubFromFolder(folder, outputDir, format);
        results.push({ folder, ...result });
        setProgress(idx, folder, result.success ? "done" : "error", result.message);
      } catch (err) {
        results.push({ folder, success: false, message: err.message });
        setProgress(idx, folder, "error", err.message);
      }
    }
  }

  const workers = Array.from({ length: parallelism }, () => worker());
  await Promise.all(workers);
  return results;
}
```

### 4.3 Progress data model

```typescript
// New type for the progress dashboard
interface ProgressItem {
  folderName: string;
  folderPath: string;
  status: "queued" | "processing" | "done" | "error";
  pagesCompleted: number;
  pagesTotal: number;
  message?: string; // error message or completion note
}

// Added to AppState
interface AppState {
  // ... existing fields
  progressItems: ProgressItem[];
  batchStartTime: number | null;     // Date.now() when batch starts
  batchEndTime: number | null;       // Date.now() when batch ends
}
```

### 4.4 Sequential fallback

- Some image-heavy folders may benefit from sequential processing (fewer `sharp` instances).
- Offer a key toggle: hold `shift` + `Enter` to force sequential.
- Or `config.parallelism = 1` for sequential mode.
- Sequential mode preserves the current single-progress-line behavior (no dashboard needed if parallelism=1).

### 4.5 Integration with progress dashboard

- When parallelism > 1, switch from single-line progress to multi-row dashboard.
- Workers update `progressItems` in the store via `set()`.
- A new component `ProgressDashboard` subscribes to `progressItems` and renders the live table.
- Dashboard replaces the static InfoMessage during batch processing.

### 4.6 Resource management

- `sharp` uses libvips which has its own internal thread pool. Running 4 workers concurrently means 4 sharp pipelines. This is fine on modern hardware (6+ cores), but on 4-core machines, default to `parallelism = 2`.
- Use `sharp.concurrency(1)` per worker to avoid saturating libvips thread pool (let each worker process one image at a time per folder, but folders run in parallel).

### 4.7 Success criteria

- Processing 4 folders of ~20 images each: all 4 complete in roughly the same time as 1 folder (4x throughput).
- Processing 8 folders on a 4-core machine: visible parallel speedup (~2-3x).
- Each folder's progress bar updates independently, no cross-contamination.
- No OOM errors from too many sharp instances.

---

## Implementation Phasing

### Phase 1 (3.0.0-alpha) — Config + CLI flags
- `~/.img2epubrc` write/read
- `--output-dir`, `--format`, `--parallel`, `--skip-existing` flags
- Format toggle persists to config
- `--init-config` flag

### Phase 2 (3.0.0-beta) — Graceful errors + Progress dashboard
- Per-image try/catch in `createEpubFromFolder`
- `ProgressItem` store type + reducer
- `ProgressDashboard` component (multi-row progress bars)
- Summary overlay component
- Large folder progressive scanning
- Skip/overwrite/rename pre-flight check

### Phase 3 (3.0.0) — Parallel processing
- Worker pool implementation
- `processingMode: "parallel" | "sequential"` state
- Integration: dashboard + workers
- Resource management (sharp concurrency, CPU detection)
- `shift+Enter` sequential override

---

## Open Questions

1. **Config path**: Should `~/.img2epubrc` support YAML? (JSON is fine for v1; YAML adds a dep.)
2. **Parallelism upper bound**: What if user has 32 cores and sets parallelism to 16? Should we hard-cap at CPU count or let them YOLO?
3. **Summary persistence**: Should summary stats be logged to a file? (Nice-to-have for v3.1.)
4. **Skip-existing UX**: When `skipExisting: true`, should the tree mark already-processed folders with a dim `(✓ saved)` badge? (Good for v3.0 if trivial.)
