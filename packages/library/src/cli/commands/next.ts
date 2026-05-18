import { AgentrackError } from "../../core/errors";
import { Tracker } from "../../core/tracker";
import { writeStderr, writeStdout } from "../output";

/**
 * Handler for the `agt next <userName>` command.
 */
export async function nextAction(userName: string): Promise<void> {
  try {
    const tracker = new Tracker();
    const result = await tracker.next(userName);
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
