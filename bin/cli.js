#!/usr/bin/env node

import { parseArgs } from "node:util";
import { runInspectCommand } from "../src/commands/inspect.js";
import { runParseCommand } from "../src/commands/parse.js";

function rootUsage() {
  return [
    "Usage:",
    "  vectorize-cli <command> <img> [options]",
    "",
    "Commands:",
    "  inspect   Inspect recommended trace options for an image",
    "  parse     Generate an SVG from an image",
    "",
    "Run 'vectorize-cli <command> --help' for command-specific help.",
  ].join("\n");
}

function inspectUsage() {
  return [
    "Usage:",
    "  vectorize-cli inspect <image-path>",
    "",
    "Options:",
    "  --help           Show this help message",
  ].join("\n");
}

function parseUsage() {
  return [
    "Usage:",
    "  vectorize-cli parse <image-path> [--options <options-json>] [--output <output-svg-path>]",
    "",
    "Options:",
    "  --options <json>        Optional. JSON options, e.g. {\"step\":2,\"colors\":[\"#ff0000\",\"#000000\"]}",
    "  --output <path>         Optional. Output SVG file path",
    "  --help                  Show this help message",
  ].join("\n");
}

function parseSubcommandOptions(command, argv) {
  const options =
    command === "inspect"
      ? {
          help: { type: "boolean", short: "h" },
        }
      : {
          options: { type: "string" },
          output: { type: "string" },
          help: { type: "boolean", short: "h" },
        };

  return parseArgs({
    args: argv,
    options,
    allowPositionals: true,
    strict: true,
  });
}

function usageFor(command) {
  return command === "inspect" ? inspectUsage() : parseUsage();
}

function isCommandHelp(command) {
  return command === "--help" || command === "-h";
}

function isValidCommand(command) {
  return command === "inspect" || command === "parse";
}

function printRootUsage(exitForHelp) {
  process.stdout.write(`${rootUsage()}\n`);
  return exitForHelp ? 0 : 1;
}

function printSubcommandUsageError(command, message) {
  process.stderr.write(`Error: ${message}\n`);
  process.stderr.write(`${usageFor(command)}\n`);
  return 1;
}

function parseSubcommand(command, args) {
  try {
    return { parsed: parseSubcommandOptions(command, args), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { parsed: null, error: message };
  }
}

async function runSubcommand(command, image, values) {
  if (command === "inspect") {
    return runInspectCommand({ image });
  }

  return runParseCommand({
    image,
    options: values.options,
    output: values.output,
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (!command) {
    return printRootUsage(false);
  }

  if (isCommandHelp(command)) {
    return printRootUsage(true);
  }

  if (!isValidCommand(command)) {
    process.stderr.write(`Error: Unknown command '${command}'.\n`);
    process.stderr.write(`${rootUsage()}\n`);
    return 1;
  }

  const { parsed, error } = parseSubcommand(command, argv.slice(1));
  if (error) {
    return printSubcommandUsageError(command, error);
  }

  if (parsed.values.help) {
    process.stdout.write(`${usageFor(command)}\n`);
    return 0;
  }

  const [image, ...extraPositionals] = parsed.positionals;
  if (!image) {
    return printSubcommandUsageError(
      command,
      "<image-path> is required as the first argument after the command."
    );
  }

  if (extraPositionals.length > 0) {
    return printSubcommandUsageError(
      command,
      `Unexpected extra positional arguments: ${extraPositionals.join(" ")}`
    );
  }

  return runSubcommand(command, image, parsed.values);
}

const exitCode = await main();
process.exitCode = exitCode;
