import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "bin", "cli.js");

function runCli(args, cwd = repoRoot) {
  return spawnSync("node", [cliPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

async function createFixture(workDir) {
  const imagePath = path.join(workDir, "sample.png");
  await sharp({
    create: {
      width: 96,
      height: 96,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 48,
            height: 96,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 },
          },
        })
          .png()
          .toBuffer(),
        top: 0,
        left: 0,
      },
      {
        input: await sharp({
          create: {
            width: 48,
            height: 48,
            channels: 4,
            background: { r: 0, g: 0, b: 255, alpha: 1 },
          },
        })
          .png()
          .toBuffer(),
        top: 24,
        left: 40,
      },
    ])
    .png()
    .toFile(imagePath);

  return imagePath;
}

test("CLI shows root help", () => {
  const result = runCli(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /vectorize-cli <command>/);
});

test("CLI inspect requires positional image", () => {
  const result = runCli(["inspect"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /<image-path> is required/);
});

test("CLI inspect and parse work end-to-end", async () => {
  const workDir = path.join(os.tmpdir(), `vectorize-cli-e2e-${randomUUID()}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    const imagePath = await createFixture(workDir);

    const inspectResult = runCli(["inspect", imagePath], workDir);
    assert.equal(inspectResult.status, 0);
    const options = JSON.parse(inspectResult.stdout);
    assert.equal(Array.isArray(options), true);
    assert.ok(options.length > 0);

    const outputPath = path.join(workDir, "output.svg");
    const parseResult = runCli(
      [
        "parse",
        imagePath,
        "--options",
        '{"step":2,"colors":["#ff0000","#000000"]}',
        "--output",
        outputPath,
      ],
      workDir
    );

    assert.equal(parseResult.status, 0);
    assert.equal(parseResult.stdout.trim(), outputPath);

    const svgContent = await fs.readFile(outputPath, "utf8");
    assert.match(svgContent, /<svg/);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
});

test("CLI parse rejects malformed --options JSON", async () => {
  const workDir = path.join(os.tmpdir(), `vectorize-cli-e2e-${randomUUID()}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    const imagePath = await createFixture(workDir);
    const result = runCli(
      ["parse", imagePath, "--options", "{bad-json}"],
      workDir
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid --options JSON/);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
});
