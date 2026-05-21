// Main API

// Error class
export { AgentrackError } from "./core/errors";
export { Tracker } from "./core/tracker";
// Branch configuration
export {
  DEFAULT_BRANCH,
  DEFAULT_DIR,
  normalizeBranchName,
  resolveWorktreeOptions,
  defaultWorktreeOptions,
  dirFromBranch,
  readBranchPointer,
  writeBranchPointer,
} from "./core/branch-config";
export type { WorktreeOptions } from "./core/branch-config";
// Worktree operations
export {
  WORKTREE_BRANCH,
  WORKTREE_DIR,
  detectInitScenario,
  initFreshWorktree,
  initJoinWorktree,
  initWorktree,
  isWorktreeInitialized,
  pullWorktree,
  pushWorktree,
  commitGitignoreChange,
  commitWorktreeData,
} from "./core/worktree";
// Resolution
export { resolveTrackerDir } from "./core/resolution";
// All data types
export type {
  BlockageAddedEvent,
  BlockageDeletedEvent,
  BlockageEntry,
  BlockageInfo,
  BlockageResolvedEvent,
  CommentDeleteEvent,
  CommentEvent,
  CommentId,
  CommentUpdateEvent,
  ComputedComment,
  ComputedIssue,
  ConfigFile,
  CreationEvent,
  DependenciesFile,
  Event,
  IndexEntry,
  IndexFile,
  IssueId,
  IssueProperties,
  IssueStatus,
  UpdateEvent,
  UserEntry,
  UserInfo,
  UsersFile,
} from "./types";
// All response types
export type {
  BlockagesAddParams,
  BlockagesAddResult,
  BlockagesDeleteParams,
  BlockagesDeleteResult,
  BlockagesListResult,
  BlockagesResolveParams,
  BlockagesResolveResult,
  CommentAddParams,
  CommentAddResult,
  CommentDeleteParams,
  CommentDeleteResult,
  CommentsListResult,
  CommentUpdateParams,
  CommentUpdateResult,
  CreateParams,
  CreateResult,
  HistoryResult,
  InitResult,
  ListParams,
  ListResult,
  NextResult,
  UpdateParams,
  UpdateResult,
  UsersListResult,
  UsersRegenerateResult,
  UsersRegisterResult,
  UsersRevokeResult,
  ViewResult,
  WorktreeInitResult,
  WorktreePullResult,
  WorktreeSyncResult,
} from "./types/api";
