# PRD: vectorize-cli

**Version**: 1.0  
**Date**: April 15, 2026  
**Author**: Carlito Platanito  

---

## 1. Executive Summary

### Problem Statement
Raster-to-vector conversion via the `vectorizer` Node.js library requires writing custom integration code each time. There is no scriptable, shell-friendly interface for batch workflows, CI pipelines, or quick one-off conversions.

### Proposed Solution
A zero-config CLI wrapper around the `vectorizer` library exposing two subcommands — `inspect` and `parse` — that accept a raster image path and optional tracing options, outputting SVG files or option metadata to stdout/disk.

### Success Criteria
- `inspect` returns valid JSON to stdout in < 2s for a typical PNG under 2MB.
- `parse` produces an optimized SVG file on disk in < 10s for a typical PNG under 2MB.
- Zero required configuration; the binary works after `npm install -g` with no additional setup.
- Non-zero exit code on all error conditions (missing file, invalid JSON, library failure).
- `--help` output documents all flags for every subcommand.

---

## 2. User Experience & Functionality

### User Personas

| Persona | Context |
|---|---|
| **Developer / DevOps** | Runs the CLI in CI scripts and Makefiles to auto-vectorize design assets. |
| **Designer** | Uses it ad-hoc from the terminal to inspect color options before committing to a trace style. |
| **Power User** | Pipes `inspect` output into `parse` via shell scripting for batch processing. |

### User Stories & Acceptance Criteria

#### US-1 — Inspect color options for an image
> As a user, I want to run `vectorize-cli inspect --image logo.png` so I can see the available tracing option sets without producing an SVG.

**Acceptance Criteria:**
- Prints a JSON array to stdout: `[{ "step": 1, "colors": ["#hex"] }, ...]`
- Exits `0` on success.
- Exits `1` with a human-readable error message to stderr if the file does not exist or is unreadable.
- Accepts absolute and relative image paths.
- Accepts `.png`, `.jpg`/`.jpeg`, `.webp`, `.heic` inputs (converted internally to PNG).

#### US-2 — Parse (vectorize) an image with auto-detected options
> As a user, I want to run `vectorize-cli parse --image logo.png` so an SVG is generated automatically using the first recommended option set.

**Acceptance Criteria:**
- Runs `inspectImage` internally and picks `options[0]`.
- Writes the output SVG to the same directory as `--image` with the same base name (e.g., `logo.svg`).
- Prints the absolute path of the generated SVG to stdout.
- Exits `0` on success, non-zero on failure.

#### US-3 — Parse with explicit option set
> As a user, I want to pass `--options '{"step":2,"colors":["#f00","#000"]}'` so I can control which tracing style is applied.

**Acceptance Criteria:**
- Parses the JSON value from `--options`.
- Validates that `step` is an integer ≥ 1 and `colors` is a non-empty array of hex strings.
- Returns exit code `1` with a descriptive stderr message if JSON is malformed or schema-invalid.
- `--options` overrides auto-detection entirely; `inspectImage` is not called.

#### US-4 — Specify output path
> As a user, I want to pass `--output ./icons/logo-traced.svg` so the SVG is written to a path I control.

**Acceptance Criteria:**
- `--output` accepts a file path (not a directory).
- Parent directories are created if they do not exist.
- Overwrites existing files without prompting (destructive by design — it's a CLI tool).

#### US-5 — Help text
> As a user, I want `--help` on the root command and each subcommand so I can discover flags without reading source code.

**Acceptance Criteria:**
- `vectorize-cli --help` lists `inspect` and `parse` with one-line descriptions.
- `vectorize-cli inspect --help` documents `--image`, `--output` flags with types and defaults.
- `vectorize-cli parse --help` documents `--image`, `--options`, `--output` flags.

### Non-Goals
- No GUI or web interface.
- No batch-directory processing (e.g., `--dir ./images/`) — that is left to shell loops.
- No SVG post-processing beyond what `vectorizer` + SVGO already apply.
- No configuration file (`.vectorizerc`, etc.) in v1.
- No watch mode.

---

## 3. Technical Specifications

### Architecture Overview

```
bin/cli.js          ← Shebang entry point; routes subcommands via parseArgs
src/
  commands/
    inspect.js      ← inspect subcommand handler
    parse.js        ← parse subcommand handler
  lib/
    prep.js         ← Image normalization + temp-dir lifecycle
    validate.js     ← --options JSON schema validation
```

**Data flow — `inspect`:**
```
user input (path)
  → validate file exists
  → prep.js: copy+convert to <tmpdir>/<uuid>/image.png, chdir(tmpdir/<uuid>)
  → vectorizer.inspectImage("image")
  → JSON.stringify(result) → stdout
  → cleanup tmpdir
```

**Data flow — `parse`:**
```
user input (path, options?)
  → validate file exists
  → prep.js: copy+convert to <tmpdir>/<uuid>/image.png, chdir(tmpdir/<uuid>)
  → if no --options: vectorizer.inspectImage("image") → options[0]
  → validate options schema
  → vectorizer.parseImage("image", step, colors)
  → read <tmpdir>/<uuid>/image.svg
  → write to resolved output path (creates parent dirs)
  → print output path to stdout
  → cleanup tmpdir
```

### Key Technical Constraints (from library analysis)

| Constraint | Detail |
|---|---|
| **CWD-relative paths** | `vectorizer` hardcodes `"./" + name + ".png"` — all invocations require a controlled `process.chdir()` into a temp dir before calling library functions. |
| **Filename without extension** | Library args are basename only (e.g., `"image"`, not `"image.png"`). |
| **PNG only** | Library reads only `.png`. Input must be pre-converted via `sharp` (already a transitive dep). |
| **ESM** | `vectorizer` is `"type": "module"`. The CLI must also be ESM (`"type": "module"` in `package.json`). |
| **Temp dir isolation** | Each invocation uses a UUID-named temp dir under `os.tmpdir()` to prevent collisions in concurrent usage. |

### Argument Parsing
Use Node's built-in `util.parseArgs` (Node ≥ 18). No third-party arg-parsing dependency.  
Add `commander` only if richer `--help` formatting is required in a later version.

### Dependencies

| Package | Role | Source |
|---|---|---|
| `vectorizer` | Core tracing engine | Already in `package.json` |
| `sharp` | PNG conversion from JPG/WEBP/HEIC | Transitive dep of `vectorizer`; import directly |
| `fs-extra` | `outputFile`, `copy` helpers | Transitive dep of `vectorizer`; import directly |
| `node:os`, `node:path`, `node:crypto` | Temp dir, path resolution | Node built-ins |
| `node:util` | `parseArgs` | Node built-in |

No new runtime dependencies are needed in v1.

### `package.json` Changes Required

```json
{
  "type": "module",
  "bin": {
    "vectorize-cli": "./bin/cli.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Security & Privacy
- All image data stays on-disk in the local temp directory; nothing is sent to any network endpoint.
- Temp directories are cleaned up in a `finally` block to avoid orphaned data after errors.
- `--options` JSON is validated against a strict schema before being passed to the library to prevent prototype pollution or unexpected inputs.
- No credentials, tokens, or API keys are required or handled.

---

## 4. Risks & Roadmap

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `process.chdir()` is process-global; breaks if library is called concurrently in the same process | Low (CLI = one process) | High | Each invocation runs as its own process; not a concern for CLI use. |
| `sharp` HEIC decoding requires platform-native binaries | Medium | Medium | Document platform requirements; gracefully error if conversion fails. |
| Library writes SVG to CWD; if cleanup fails, temp files accumulate | Low | Low | Always delete temp dir in `finally`; log warning if cleanup fails. |
| Transitive dep `sharp` API may differ from what's directly called | Low | Low | Pin acceptable version range in `package.json`. |

### Phased Roadmap

#### MVP (v1.0)
- `inspect` subcommand with `--image`, `--output` (print to stdout)
- `parse` subcommand with `--image`, `--options`, `--output`
- PNG/JPG/WEBP input support
- `--help` for all commands
- Proper exit codes
- npm-global installable (`npm install -g vectorize-cli`)

#### v1.1
- `--format json` flag on `inspect` (default) vs. `--format table` for human-readable color preview
- HEIC input support
- `--pick <index>` flag on `parse` to select a specific inspect result by index without passing raw JSON
- Colorized terminal output

#### v2.0
- `--dir` batch mode for processing all images in a directory
- `.vectorizerc` config file support for default options
- Progress bar for batch operations
- `--watch` mode
