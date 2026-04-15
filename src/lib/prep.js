import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const SUPPORTED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".heic",
]);

function getExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

export async function validateImagePath(imagePath) {
  if (!imagePath || typeof imagePath !== "string") {
    throw new Error("Missing required image path.");
  }

  const absoluteImagePath = path.resolve(imagePath);

  let stats;
  try {
    stats = await fs.stat(absoluteImagePath);
  } catch {
    throw new Error(`Image not found: ${absoluteImagePath}`);
  }

  if (!stats.isFile()) {
    throw new Error(`Image path must be a file: ${absoluteImagePath}`);
  }

  const ext = getExtension(absoluteImagePath);
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Unsupported image format: ${ext || "(none)"}. Supported formats: ${[
        ...SUPPORTED_EXTENSIONS,
      ].join(", ")}`
    );
  }

  return {
    absoluteImagePath,
    ext,
  };
}

async function normalizeToPng(sourcePath, sourceExt, outputPngPath) {
  if (sourceExt === ".png") {
    await fs.copyFile(sourcePath, outputPngPath);
    return;
  }

  try {
    await sharp(sourcePath).png().toFile(outputPngPath);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to convert image to PNG (${sourceExt} -> .png): ${detail}`
    );
  }
}

export async function prepareImageWorkspace(imagePath) {
  const { absoluteImagePath, ext } = await validateImagePath(imagePath);

  const originalCwd = process.cwd();
  const tempDir = path.join(os.tmpdir(), `vectorize-cli-${randomUUID()}`);
  const imageBaseName = "image";
  const stagedImagePath = path.join(tempDir, `${imageBaseName}.png`);

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await normalizeToPng(absoluteImagePath, ext, stagedImagePath);
    process.chdir(tempDir);
  } catch (error) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Keep the original setup error as the primary failure signal.
    }
    throw error;
  }

  let cleanedUp = false;

  const cleanup = async () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;

    let cleanupError;

    try {
      process.chdir(originalCwd);
    } catch (error) {
      cleanupError =
        error instanceof Error
          ? new Error(`Failed to restore working directory: ${error.message}`)
          : new Error("Failed to restore working directory.");
    }

    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      if (!cleanupError) {
        cleanupError =
          error instanceof Error
            ? new Error(`Failed to remove temp directory: ${error.message}`)
            : new Error("Failed to remove temp directory.");
      }
    }

    if (cleanupError) {
      throw cleanupError;
    }
  };

  return {
    tempDir,
    imageBaseName,
    originalCwd,
    inputImagePath: absoluteImagePath,
    stagedImagePath,
    cleanup,
  };
}
