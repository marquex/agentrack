import { AgentrackError } from "../../core/errors";
import { Tracker } from "../../core/tracker";
import { writeStderr, writeStdout } from "../output";

/**
 * Handler for the `agt init` command.
 * Creates a `.agentrack/` directory in the current working directory.
 */
export async function initAction(): Promise<void> {
  try {
    const tracker = new Tracker();
    const result = await tracker.init();
    writeStdout(result);
    process.exit(0);
  } catch (err) {
    if (err instanceof AgentrackError) {
      writeStderr({ result: err.result, message: err.message });
      process.exit(err.exitCode);
    }
    // Unexpected errors
    writeStderr({ result: "INTERNAL_ERROR", message: (err as Error).message });
    process.exit(1);
  }
}
