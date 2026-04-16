---
name: vectorize-cli
description: 'Convert raster images to SVG via command line. Inspect tracing options and generate vectorized SVGs with auto-detected or custom color/step settings.'
license: MIT
---

# vectorize-cli Skill

A lightweight command-line tool for converting raster images (PNG, JPG, WEBP, HEIC) to scalable vector graphics (SVG).

## When to Use

Use this skill when:

- You need to convert an image file to SVG format
- You want to inspect recommended tracing options before committing to a trace style
- You're building automation or batch workflows that require image vectorization
- You need to control color count and tracing granularity via JSON options
- You're working in CI/CD and need clear exit codes and structured output

**Triggers:** "vectorize this image", "convert to SVG", "trace image", "raster to vector", "inspect image options", "batch convert images"

## How to Use

### Prerequisites

- Node.js >= 18.0.0
- vectorize-cli installed: `npm install -g .` or local invocation via `npm run start`

### Command Syntax

```
vectorize-cli <command> <image-path> [options]
```

### The Two Core Commands

#### 1. Inspect

Analyzes an image and returns recommended tracing option sets as JSON.

```bash
vectorize-cli inspect <image-path>
```

**Output:** JSON array of option objects, each with `{ "step": <int>, "colors": [<hex-strings>] }`

**Use case:** Before committing to a parse, review what the tool recommends.

#### 2. Parse

Converts an image to SVG.

```bash
vectorize-cli parse <image-path> [--options <options-json>] [--output <output-svg-path>]
```

**Options:**
- `--options <json>`: Explicit tracing settings (object shape: `{"step":2,"colors":["#hex","#hex"]}`)
- `--output <path>`: Where to write the SVG file (defaults to same directory as input with `.svg` extension)

**Output:** Absolute path to the generated SVG file

**Use case:** Generate a vectorized SVG from a raster image with optional control over trace granularity and colors.

## Examples

### Workflow 1: Auto-vectorize a single image

```bash
vectorize-cli parse ./logo.png
# Output: /absolute/path/to/logo.svg
```

### Workflow 2: Inspect options, then parse with custom settings

```bash
# Step 1: See what options are recommended
vectorize-cli inspect ./icon.png
# Output: [{"step":1,"colors":["#ff0000"]},{"step":2,"colors":["#ff0000","#0000ff"]}]

# Step 2: Use the second option set
vectorize-cli parse ./icon.png \
  --options '{"step":2,"colors":["#ff0000","#0000ff"]}' \
  --output ./icons/icon-traced.svg
```

### Workflow 3: Batch convert with custom output directory

```bash
for img in ./images/*.png; do
  [ -e "$img" ] || continue
  vectorize-cli parse "$img" \
    --output "./svg/$(basename "${img%.*}").svg"
done
```

### Workflow 4: CI pipeline with error handling

```bash
#!/bin/bash
set -euo pipefail

# Fail fast if conversion doesn't work
vectorize-cli parse ./assets/banner.webp \
  --options '{"step":3,"colors":["#112233","#445566","#778899"]}' \
  --output ./build/banner.svg

echo "SVG generated: $?"
```

## Input Formats

Supports:
- `.png`
- `.jpg`, `.jpeg`
- `.webp`
- `.heic` (with platform-native tooling)

## Options JSON Schema

```json
{
  "step": 2,
  "colors": ["#ff0000", "#000000"]
}
```

**Validation:**
- `step`: integer >= 1 (higher values = more color layers)
- `colors`: non-empty array of hex strings in `#rgb` or `#rrggbb` format

## Output Behavior

- **Input path:** Relative or absolute; can be in any readable directory
- **Output directory:** Created automatically if it does not exist
- **Output filename:** If `--output` not provided, defaults to input directory with same basename and `.svg` extension
- **Overwrite:** Existing files are silently overwritten

## Exit Codes

- `0`: Success
- `1`: Failure (invalid arguments, unreadable image, malformed options, conversion error)

Use exit codes for shell scripting and CI automation.

## Error Handling

| Error | Cause | Solution |
|---|---|---|
| `Image not found: <path>` | File does not exist or is unreadable | Check file path and permissions |
| `Unsupported image format: <ext>` | File extension not in supported list | Convert to PNG/JPG/WEBP/HEIC first |
| `Invalid --options JSON: ...` | Malformed JSON or invalid schema | Validate JSON and ensure `step >= 1` and `colors` is non-empty hex array |
| `<image-path> is required` | Missing positional image argument | Provide image path as first argument after command |

## Best Practices

1. **For CI/CD:** Always use `--options` for reproducible, deterministic traces. Auto-detection can vary.
2. **For batch workflows:** Wrap in a shell loop and check exit codes.
3. **For large images:** Generate on a machine with sufficient memory for sharp processing.
4. **For color control:** Inspect first to understand the recommended color palettes, then pick the best fit.

## Troubleshooting

### "Invalid --options JSON"

Ensure JSON is wrapped in single quotes and property names are quoted:

```bash
# Correct
vectorize-cli parse image.png --options '{"step":2,"colors":["#ff0000"]}'

# Incorrect
vectorize-cli parse image.png --options {"step":2,"colors":["#ff0000"]}
```

### HEIC conversion fails

HEIC support requires native library availability on your system. If it fails, convert to PNG first:

```bash
# Convert HEIC to PNG (e.g., with ImageMagick or sharp directly)
# Then run vectorize-cli on the PNG
```

### No options returned by inspect

Inspect returned an empty array. This may indicate an issue with the image. Try with a different image or check logs.

## Related Resources

- **Vectorizer library:** https://github.com/btk/vectorizer
- **vectorize-cli repo:** https://github.com/carlitoplatanito/vectorizer-cli
- **SVG format:** https://www.w3.org/Graphics/SVG/

## License

MIT
