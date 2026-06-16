import type { CommentId, IssueId, IssueProperties } from "./issue";

/**
 * Base shape shared by all events.
 */
export interface BaseEvent {
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Resolved user name or "system". */
  author: string;
}

/**
 * Creation event — marks the birth of an issue.
 * Always the first event in an issue file.
 */
export interface CreationEvent extends BaseEvent {
  type: "creation";
}

/**
 * Update event — records changes to issue properties.
 * Includes an optional reason field for system-authored auto-promotion events.
 */
export interface UpdateEvent extends BaseEvent {
  type: "update";
  content: Partial<
    Pick<
      IssueProperties,
      "title" | "description" | "status" | "assignee" | "tags" | "priority" | "parentId"
    >
  > & {
    /** Optional reason explaining why the update was applied (e.g. auto-promotion). */
    reason?: string;
  };
}

/**
 * Comment event — adds a new comment to an issue.
 */
export interface CommentEvent extends BaseEvent {
  type: "comment";
  content: {
    id: CommentId;
    content: string;
  };
}

/**
 * Comment update event — edits an existing comment's content.
 */
export interface CommentUpdateEvent extends BaseEvent {
  type: "comment-update";
  content: {
    id: CommentId;
    content: string;
  };
}

/**
 * Comment delete event — soft-deletes a comment.
 * Deleted comments are excluded from computed output but remain in the event log.
 */
export interface CommentDeleteEvent extends BaseEvent {
  type: "comment-delete";
  content: {
    id: CommentId;
  };
}

/**
 * Blockage added event — records a new dependency between two issues.
 */
export interface BlockageAddedEvent extends BaseEvent {
  type: "blockage-added";
  content: {
    blockerId: IssueId;
  };
}

/**
 * Blockage resolved event — records dependency resolution.
 * Includes an optional reason for why the blockage was resolved.
 */
export interface BlockageResolvedEvent extends BaseEvent {
  type: "blockage-resolved";
  content: {
    blockerId: IssueId;
    reason?: string;
  };
}

/**
 * Blockage deleted event — records dependency removal.
 */
export interface BlockageDeletedEvent extends BaseEvent {
  type: "blockage-deleted";
  content: {
    blockerId: IssueId;
  };
}

/**
 * Custom event — a user or agent-authored event stored alongside reserved events.
 *
 * The `type` is a caller-chosen string that MUST NOT collide with a reserved
 * agentrack event type (see {@link RESERVED_EVENT_TYPES}). The `content` is an
 * arbitrary JSON object. Custom events are never interpreted by agentrack state
 * computation: they are silently ignored by `computeState` and `computeComments`,
 * but they DO count as real activity and bump `updatedAt`.
 */
export interface CustomEvent extends BaseEvent {
  /** Caller-chosen type string; must not be a reserved agentrack type. */
  type: string;
  /** Arbitrary JSON object payload. Must be a plain object (not array/primitive). */
  content: Record<string, unknown>;
}

/**
 * Union of all event types.
 * Each event in an issue file is one of these variants.
 */
export type Event =
  | CreationEvent
  | UpdateEvent
  | CommentEvent
  | CommentUpdateEvent
  | CommentDeleteEvent
  | BlockageAddedEvent
  | BlockageResolvedEvent
  | BlockageDeletedEvent
  | CustomEvent;

/**
 * The complete list of agentrack reserved event types.
 *
 * These are the event `type` strings owned and interpreted by agentrack's own
 * state computation. Custom events MUST NOT use any of these type strings.
 */
export const RESERVED_EVENT_TYPES = [
  "creation",
  "update",
  "comment",
  "comment-update",
  "comment-delete",
  "blockage-added",
  "blockage-resolved",
  "blockage-deleted",
] as const;

/** A reserved agentrack event type string. */
export type ReservedEventType = (typeof RESERVED_EVENT_TYPES)[number];

/**
 * Returns true when the given type string collides with a reserved agentrack
 * event type.
 *
 * @param type - The event type string to test.
 */
export function isReservedEventType(type: string): boolean {
  return (RESERVED_EVENT_TYPES as readonly string[]).includes(type);
}

// ─── Type guards ────────────────────────────────────────────────────
//
// CustomEvent widens `type` to `string`, which prevents TypeScript from
// discriminating the Event union via `event.type === "..."`. These guards
// restore precise narrowing for reserved variants.

/** Narrows to CreationEvent. */
export function isCreationEvent(event: Event): event is CreationEvent {
  return event.type === "creation";
}

/** Narrows to UpdateEvent. */
export function isUpdateEvent(event: Event): event is UpdateEvent {
  return event.type === "update";
}

/** Narrows to CommentEvent. */
export function isCommentEvent(event: Event): event is CommentEvent {
  return event.type === "comment";
}

/** Narrows to CommentUpdateEvent. */
export function isCommentUpdateEvent(event: Event): event is CommentUpdateEvent {
  return event.type === "comment-update";
}

/** Narrows to CommentDeleteEvent. */
export function isCommentDeleteEvent(event: Event): event is CommentDeleteEvent {
  return event.type === "comment-delete";
}
