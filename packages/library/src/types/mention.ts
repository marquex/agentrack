/**
 * A single mention entry — links a comment to a mentioned user.
 * Stored in mentions.json keyed by mentionedUser.
 */
export interface MentionEntry {
  /** 10-char ID: 6 from timestamp base36 + 4 random base36. */
  id: string;
  /** ISO 8601 — when the mention was created. */
  createdAt: string;
  /** The user who was mentioned (lowercase). */
  mentionedUser: string;
  /** The user who wrote the comment (lowercase). */
  mentionedBy: string;
  /** The issue where the comment lives. */
  issueId: string;
  /** The comment that contains the mention. */
  commentId: string;
  /** Whether the mention has been read by the mentioned user. */
  isRead: boolean;
}

/**
 * Mentions file — keyed by mentionedUser, each value is an array
 * of mention entries sorted by ID (creation time).
 * Stored at `.agentrack/mentions.json`.
 */
export type MentionsFile = Record<string, MentionEntry[]>;

/**
 * Result item for mentionsList.
 */
export interface MentionResult {
  id: string;
  mentionedBy: string;
  issueId: string;
  commentId: string;
  createdAt: string;
  isRead: boolean;
}

/**
 * Full result for mentionsView — includes mention, comment, and issue context.
 */
export interface MentionViewResult {
  mention: MentionEntry;
  comment: {
    id: string;
    author: string;
    content: string;
    timestamp: string;
    editedAt?: string;
  };
  issue: {
    id: string;
    title: string;
  };
}
