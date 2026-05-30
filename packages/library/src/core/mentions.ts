import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { IndexEntry } from "../types";
import type { MentionEntry, MentionsFile } from "../types/mention";
import { atomicWriteJSON } from "./file-io";
import { computeComments, replayEvents } from "./events";
import { generateId } from "./id";

const MENTIONS_FILE = "mentions.json";

/**
 * Extract @mentions from comment content.
 * Returns unique, lowercase, registered usernames mentioned in content.
 * Regex matches @name at start of string or after a non-word character,
 * avoiding email addresses.
 */
export function extractMentions(content: string, registeredUsers: string[]): string[] {
  const regex = /(?:^|(?<=\W))@([\w-]+)/g;
  const mentioned = new Set<string>();
  const registeredSet = new Set(registeredUsers.map((u) => u.toLowerCase()));

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1]!.toLowerCase();
    if (registeredSet.has(name)) {
      mentioned.add(name);
    }
  }

  return Array.from(mentioned);
}

/**
 * Read mentions.json from the tracker directory.
 * Returns empty object if the file doesn't exist (upgrade scenario).
 */
export function readMentionsFile(dir: string): MentionsFile {
  const filePath = join(dir, MENTIONS_FILE);
  if (!existsSync(filePath)) {
    return {};
  }
  const contents = readFileSync(filePath, "utf-8");
  return JSON.parse(contents) as MentionsFile;
}

/**
 * Write mentions.json atomically.
 */
export async function writeMentionsFile(dir: string, data: MentionsFile): Promise<void> {
  const filePath = join(dir, MENTIONS_FILE);
  await atomicWriteJSON(filePath, data);
}

/**
 * Add mention entries to the mentions file.
 * Entries are grouped by mentionedUser and each array is kept sorted by id.
 * Immutably updates the file.
 */
export async function addMentionEntries(dir: string, entries: MentionEntry[]): Promise<void> {
  if (entries.length === 0) return;

  const mentions = readMentionsFile(dir);

  for (const entry of entries) {
    const user = entry.mentionedUser;
    const existing = mentions[user] ?? [];
    // Insert while maintaining sort by id
    const insertIdx = existing.findIndex((e) => e.id > entry.id);
    if (insertIdx === -1) {
      mentions[user] = [...existing, entry];
    } else {
      mentions[user] = [
        ...existing.slice(0, insertIdx),
        entry,
        ...existing.slice(insertIdx),
      ];
    }
  }

  await writeMentionsFile(dir, mentions);
}

/**
 * Remove all mention entries with the given commentId.
 * Cleans up empty user keys (no empty arrays left in the file).
 */
export async function removeCommentMentions(dir: string, commentId: string): Promise<void> {
  const mentions = readMentionsFile(dir);
  let changed = false;

  for (const user of Object.keys(mentions)) {
    const entries = mentions[user]!;
    const filtered = entries.filter((e) => e.commentId !== commentId);
    if (filtered.length !== entries.length) {
      changed = true;
      if (filtered.length === 0) {
        delete mentions[user];
      } else {
        mentions[user] = filtered;
      }
    }
  }

  if (changed) {
    await writeMentionsFile(dir, mentions);
  }
}

/**
 * Remove all mention entries for a given issue ID.
 * Cleans up empty user keys.
 */
export async function removeIssueMentions(dir: string, issueId: string): Promise<void> {
  const mentions = readMentionsFile(dir);
  let changed = false;

  for (const user of Object.keys(mentions)) {
    const entries = mentions[user]!;
    const filtered = entries.filter((e) => e.issueId !== issueId);
    if (filtered.length !== entries.length) {
      changed = true;
      if (filtered.length === 0) {
        delete mentions[user];
      } else {
        mentions[user] = filtered;
      }
    }
  }

  if (changed) {
    await writeMentionsFile(dir, mentions);
  }
}

/**
 * Rebuild the entire mentions index from scratch by scanning all issue event files.
 * Clears the existing index and re-extracts all mentions from all non-deleted comments.
 * Returns the total number of mentions created.
 */
export async function rebuildMentionsIndex(
  dir: string,
  issues: IndexEntry[],
  getRegisteredUsers: () => string[],
): Promise<number> {
  const registeredUsers = getRegisteredUsers();
  const mentions: MentionsFile = {};
  let count = 0;

  for (const issue of issues) {
    const issueFilePath = join(dir, issue.path);
    if (!existsSync(issueFilePath)) continue;

    const events = await replayEvents(issueFilePath);
    const comments = computeComments(events);

    for (const comment of comments) {
      const mentionedUsers = extractMentions(comment.content, registeredUsers);

      for (const userName of mentionedUsers) {
        const entry: MentionEntry = {
          id: generateId(),
          createdAt: comment.timestamp,
          mentionedUser: userName,
          mentionedBy: comment.author,
          issueId: issue.id,
          commentId: comment.id,
          isRead: false,
        };

        if (!mentions[userName]) {
          mentions[userName] = [];
        }
        mentions[userName]!.push(entry);
        count++;
      }
    }
  }

  // Sort each user's mentions by id
  for (const user of Object.keys(mentions)) {
    mentions[user]!.sort((a, b) => a.id.localeCompare(b.id));
  }

  await writeMentionsFile(dir, mentions);
  return count;
}

/**
 * Find a mention by ID across all user arrays.
 * Returns the entry and the user key, or null if not found.
 */
export function findMentionById(
  dir: string,
  id: string,
): { entry: MentionEntry; user: string } | null {
  const mentions = readMentionsFile(dir);

  for (const user of Object.keys(mentions)) {
    const entries = mentions[user]!;
    const found = entries.find((e) => e.id === id);
    if (found) {
      return { entry: found, user };
    }
  }

  return null;
}
