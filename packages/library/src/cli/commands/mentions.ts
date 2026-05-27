import { AgentrackError } from "../../core/errors";
import { Tracker } from "../../core/tracker";
import { writeStderr, writeStdout } from "../output";

/**
 * Handler for the `agt mentions list <agent-name> [--include-reads]` command.
 */
export async function mentionsListAction(
  userName: string,
  options?: { includeReads?: boolean },
): Promise<void> {
  try {
    const tracker = new Tracker();
    const result = await tracker.mentionsList(userName, {
      includeReads: options?.includeReads ?? false,
    });
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

/**
 * Handler for the `agt mentions view <mention-id>` command.
 */
export async function mentionsViewAction(mentionId: string): Promise<void> {
  try {
    const tracker = new Tracker();
    const result = await tracker.mentionsView(mentionId);
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

/**
 * Handler for the `agt mentions read <mention-id>` command.
 */
export async function mentionsReadAction(mentionId: string): Promise<void> {
  try {
    const tracker = new Tracker();
    const result = await tracker.mentionsRead(mentionId);
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

/**
 * Handler for the `agt mentions unread <mention-id>` command.
 */
export async function mentionsUnreadAction(mentionId: string): Promise<void> {
  try {
    const tracker = new Tracker();
    const result = await tracker.mentionsUnread(mentionId);
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

/**
 * Handler for the `agt mentions rebuild` command.
 */
export async function mentionsRebuildAction(): Promise<void> {
  try {
    const tracker = new Tracker();
    const result = await tracker.mentionsRebuild();
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
