import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { prepareImageWorkspace, validateImagePath } from "../src/lib/prep.js";

async function createFixturePng() {
  const dir = path.join(os.tmpdir(), `vectorize-cli-test-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  const imagePath = path.join(dir, "input.png");

  await sharp({
    create: {
      width: 48,
      height: 48,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toFile(imagePath);

  return { dir, imagePath };
}

test("validateImagePath throws when image does not exist", async () => {
  await assert.rejects(
    () => validateImagePath("./does-not-exist.png"),
    /Image not found/
  );
});

test("prepareImageWorkspace stages image and cleanup restores cwd", async () => {
  const originalCwd = process.cwd();
  const { dir, imagePath } = await createFixturePng();
  let workspace;

  try {
    workspace = await prepareImageWorkspace(imagePath);

    assert.notEqual(process.cwd(), originalCwd);
    const cwdRealPath = await fs.realpath(process.cwd());
    const tempDirRealPath = await fs.realpath(workspace.tempDir);
    assert.equal(cwdRealPath, tempDirRealPath);

    const stagedStats = await fs.stat(workspace.stagedImagePath);
    assert.equal(stagedStats.isFile(), true);

    const stagedBase = path.basename(workspace.stagedImagePath);
    assert.equal(stagedBase, "image.png");
    assert.equal(workspace.imageBaseName, "image");
  } finally {
    if (workspace?.cleanup) {
      await workspace.cleanup();
    }

    assert.equal(process.cwd(), originalCwd);

    const tempDirExists = await fs
      .stat(workspace?.tempDir ?? "")
      .then(() => true)
      .catch(() => false);
    assert.equal(tempDirExists, false);

    await fs.rm(dir, { recursive: true, force: true });
  }
});
