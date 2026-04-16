# vectorize-cli

A clean, script-friendly command line wrapper for the Vectorizer Node library.

Convert raster images to SVG from your terminal with two focused commands:

- inspect: Suggests tracing options for an image
- parse: Generates an SVG using auto-detected or custom options

Built for local workflows, batch scripts, and CI jobs.

## Features

- Simple command structure: vectorize-cli <command> <img> [options]
- Works with PNG, JPG, JPEG, WEBP, and HEIC inputs
- Produces SVG output with sensible defaults
- Supports advanced control via JSON options
- Clear errors and non-zero exit codes for automation

## Installation ⚙️

### Option 1: Local development usage

~~~bash
npm install
npm run start -- --help
~~~

### Option 2: Global install from this repo

~~~bash
npm install -g .
vectorize-cli --help
~~~

## Quick Start 🚀

### 1) Inspect suggested tracing options 🔍

~~~bash
vectorize-cli inspect ./fixtures/sample.png
~~~

Example output:

~~~json
[
  {
    "step": 1,
    "colors": ["#0404fc"]
  },
  {
    "step": 2,
    "colors": ["#0404fc", "#fc0404"]
  }
]
~~~

### 2) Parse with auto-selected options ✨

Uses the first inspect suggestion automatically.

~~~bash
vectorize-cli parse ./fixtures/sample.png
~~~

Example output:

~~~text
/absolute/path/to/sample.svg
~~~

### 3) Parse with explicit options

~~~bash
vectorize-cli parse ./fixtures/sample.png \
  --options '{"step":2,"colors":["#ff0000","#000000"]}' \
  --output ./out/sample-custom.svg
~~~

## Command Reference 📚

## inspect

Usage:

~~~text
vectorize-cli inspect <image-path>
~~~

Description:

- Analyzes the image and prints recommended parse option sets as JSON.

Examples:

~~~bash
vectorize-cli inspect ./logo.png
vectorize-cli inspect /Users/you/images/banner.webp
~~~

## parse

Usage:

~~~text
vectorize-cli parse <image-path> [--options <options-json>] [--output <output-svg-path>]
~~~

Description:

- Converts an image to SVG.
- If --options is not provided, inspect is run internally and the first option set is used.

Options:

- --options <json>: tracing options object
- --output <path>: output SVG file path

Examples:

~~~bash
# Auto options, writes next to input with same basename
vectorize-cli parse ./assets/icon.png

# Manual options
vectorize-cli parse ./assets/icon.png \
  --options '{"step":3,"colors":["#112233","#445566","#778899"]}'

# Custom output path
vectorize-cli parse ./assets/icon.png \
  --output ./dist/icon.svg
~~~

## Options JSON format

Expected shape:

~~~json
{
  "step": 2,
  "colors": ["#ff0000", "#000000"]
}
~~~

Validation rules:

- step must be an integer >= 1
- colors must be a non-empty array
- every color must be a hex value in #rgb or #rrggbb format

## Input and Output Behavior

- Input path can be relative or absolute
- Output defaults to: same directory as input, same basename, .svg extension
- Parent directories for custom output are created automatically
- Existing output files are overwritten

## Exit Codes

- 0: Success
- 1: Failure (invalid args, unreadable image, malformed options, conversion failure, etc.)

This makes the CLI easy to use in shell scripts and CI pipelines.

## Script and CI Examples

### Bash loop for bulk conversion

~~~bash
for img in ./images/*.{png,jpg,jpeg,webp}; do
  [ -e "$img" ] || continue
  vectorize-cli parse "$img" --output "./svg/$(basename "${img%.*}").svg"
done
~~~

### Fail-fast CI step

~~~bash
set -euo pipefail
vectorize-cli inspect ./images/logo.png > /tmp/logo-options.json
vectorize-cli parse ./images/logo.png --output ./artifacts/logo.svg
~~~

## Troubleshooting 🛠️

### Error: <image-path> is required as the first argument

You must pass the image immediately after the command.

~~~bash
# Correct
vectorize-cli parse ./image.png

# Incorrect
vectorize-cli parse --output ./out.svg
~~~

### Error: Invalid --options JSON

- Wrap JSON in single quotes in your shell
- Ensure property names are quoted

~~~bash
vectorize-cli parse ./image.png --options '{"step":2,"colors":["#ff0000","#000000"]}'
~~~

### HEIC conversion issues

HEIC support depends on native image tooling available to sharp on your system. If conversion fails, convert to PNG first and retry.

## Development 👩‍💻

Run smoke commands:

~~~bash
npm run smoke:inspect
npm run smoke:parse
~~~

Run tests:

~~~bash
npm test
~~~

## Project Structure

- bin/cli.js: command parsing and routing
- src/commands/inspect.js: inspect command implementation
- src/commands/parse.js: parse command implementation
- src/lib/prep.js: image staging, temp workspace, and cleanup
- src/lib/validate.js: options JSON parsing and schema validation
- test/: unit and integration tests

## Credits

- Uses the vectorizer library: https://github.com/btk/vectorizer
- This project is a CLI wrapper focused on usability and scripting workflows

## License

MIT
