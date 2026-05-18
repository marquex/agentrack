import { AgentrackError } from "../../core/errors";
import { Tracker } from "../../core/tracker";
import { writeStderr, writeStdout } from "../output";

/**
 * Handler for the `agt comments add <issueId> --content <content>` command.
 */
export async function commentsAddAction(
  issueId: string,
  options: { content: string },
): Promise<void> {
  try {
    const tracker = new Tracker();
    const result = await tracker.commentsAdd(issueId, { content: options.content });
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
 * Handler for the `agt comments update <issueId> <commentId> --content <content>` command.
 */
export async function commentsUpdateAction(
  issueId: string,
  commentId: string,
  options: { content: string },
): Promise<void> {
  try {
    const tracker = new Tracker();
    const result = await tracker.commentsUpdate(issueId, commentId, { content: options.content });
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
 * Handler for the `agt comments delete <issueId> <commentId>` command.
 */
export async function commentsDeleteAction(issueId: string, commentId: string): Promise<void> {
  try {
    const tracker = new Tracker();
    const result = await tracker.commentsDelete(issueId, commentId);
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
 * Handler for the `agt comments list <issueId>` command.
 */
export async function commentsListAction(issueId: string): Promise<void> {
  try {
    const tracker = new Tracker();
    const result = await tracker.commentsList(issueId);
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
