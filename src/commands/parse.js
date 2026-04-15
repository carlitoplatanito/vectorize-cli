import { promises as fs } from "node:fs";
import path from "node:path";
import { inspectImage, parseImage } from "vectorizer";
import { prepareImageWorkspace } from "../lib/prep.js";
import { parseOptionsJson, validateOptions } from "../lib/validate.js";

function resolveOutputPath(inputImagePath, output, originalCwd) {
  if (output) {
    return path.resolve(originalCwd, output);
  }

  const parsed = path.parse(inputImagePath);
  return path.join(parsed.dir, `${parsed.name}.svg`);
}

export async function runParseCommand({ image, options, output }) {
  let workspace;
  let exitCode = 0;

  try {
    workspace = await prepareImageWorkspace(image);

    let selectedOptions;
    if (typeof options === "string" && options.trim() !== "") {
      selectedOptions = validateOptions(parseOptionsJson(options));
    } else {
      const detectedOptions = await inspectImage(workspace.imageBaseName);
      if (!Array.isArray(detectedOptions) || detectedOptions.length === 0) {
        throw new Error("No parse options were returned by inspectImage.");
      }

      selectedOptions = validateOptions(detectedOptions[0]);
    }

    const originalConsoleLog = console.log;
    console.log = () => {};
    try {
      await parseImage(
        workspace.imageBaseName,
        selectedOptions.step,
        selectedOptions.colors
      );
    } finally {
      console.log = originalConsoleLog;
    }

    const generatedSvgPath = path.join(
      workspace.tempDir,
      `${workspace.imageBaseName}.svg`
    );
    const svgContent = await fs.readFile(generatedSvgPath, "utf8");

    const outputPath = resolveOutputPath(
      workspace.inputImagePath,
      output,
      workspace.originalCwd
    );
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, svgContent, "utf8");

    process.stdout.write(`${outputPath}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    exitCode = 1;
  } finally {
    if (workspace?.cleanup) {
      try {
        await workspace.cleanup();
      } catch (cleanupError) {
        const message =
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError);
        process.stderr.write(`Error: Cleanup failed: ${message}\n`);
        exitCode = 1;
      }
    }
  }

  return exitCode;
}
