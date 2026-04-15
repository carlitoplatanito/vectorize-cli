import { inspectImage } from "vectorizer";
import { prepareImageWorkspace } from "../lib/prep.js";

export async function runInspectCommand({ image }) {
  let workspace;
  let exitCode = 0;

  try {
    workspace = await prepareImageWorkspace(image);
    const options = await inspectImage(workspace.imageBaseName);
    process.stdout.write(`${JSON.stringify(options, null, 2)}\n`);
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
