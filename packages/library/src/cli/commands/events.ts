import { AgentrackError, ErrorCodes } from "../../core/errors";
import { Tracker } from "../../core/tracker";
import { writeStderr, writeStdout } from "../output";

/**
 * Determine whether a value is a plain JSON object (not null, not array).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Handler for the `agt events list <issueId>` command.
 *
 * Returns the issue's raw events. When `--type` is provided, the result is
 * filtered to events whose `type` matches exactly.
 */
export async function eventsListAction(
  issueId: string,
  options: { type?: string },
): Promise<void> {
  try {
    const tracker = new Tracker();
    const result =
      options.type !== undefined
        ? await tracker.eventsList(issueId, { type: options.type })
        : await tracker.eventsList(issueId);
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
 * Handler for the `agt events add <issueId> <event-json>` command.
 *
 * Accepts a JSON object with a `type` string (must not collide with a reserved
 * agentrack type) and a `content` JSON object. Agentrack auto-attaches the
 * `timestamp` and `author`.
 */
export async function eventsAddAction(issueId: string, eventJson: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(eventJson);
  } catch {
    writeStderr({
      result: ErrorCodes.INVALID_PARAMS.result,
      message: "Event JSON is not valid JSON.",
    });
    process.exit(ErrorCodes.INVALID_PARAMS.exitCode);
    return;
  }

  // Early friendly CLI validation; the tracker remains the source of truth.
  if (!isPlainObject(parsed)) {
    writeStderr({
      result: ErrorCodes.INVALID_PARAMS.result,
      message: "Event must be a JSON object with `type` and `content`.",
    });
    process.exit(ErrorCodes.INVALID_PARAMS.exitCode);
    return;
  }

  const { type, content } = parsed as { type?: unknown; content?: unknown };

  if (typeof type !== "string" || type.trim().length === 0) {
    writeStderr({
      result: ErrorCodes.INVALID_PARAMS.result,
      message: "Event `type` must be a non-empty string.",
    });
    process.exit(ErrorCodes.INVALID_PARAMS.exitCode);
    return;
  }

  if (!isPlainObject(content)) {
    writeStderr({
      result: ErrorCodes.INVALID_PARAMS.result,
      message: "Event `content` must be a plain JSON object.",
    });
    process.exit(ErrorCodes.INVALID_PARAMS.exitCode);
    return;
  }

  try {
    const tracker = new Tracker();
    const result = await tracker.eventsAdd(issueId, {
      type,
      content: content as Record<string, unknown>,
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
