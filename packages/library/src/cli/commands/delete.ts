import { AgentrackError } from "../../core/errors";
import { Tracker } from "../../core/tracker";
import { writeStderr, writeStdout } from "../output";

/**
 * Handler for the `agt delete <issueId>` command.
 */
export async function deleteAction(issueId: string): Promise<void> {
  try {
    const tracker = new Tracker();
    const result = await tracker.issueDelete(issueId);

    if (result instanceof AgentrackError) {
      writeStderr({ result: result.result, message: result.message });
      process.exit(result.exitCode);
    }

    writeStdout(result);
    process.exit(0);
  } catch (err) {
    if (err instanceof AgentrackError) {
      writeStderr({ result: err.result, message: err.message });
      process.exit(err.exitCode);
    }
    writeStderr({ result: "INTERNAL_ERROR", message: (err as Error).message });
    process.exit(1);
  }
}
