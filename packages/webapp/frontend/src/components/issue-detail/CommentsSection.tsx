import { useState, useRef, useEffect } from "react";
import { useComments, useAddComment, useUpdateComment, useDeleteComment } from "@/hooks/use-comments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Pencil, Trash2, X, Check } from "lucide-react";

interface CommentsSectionProps {
  issueId: string;
}

export function CommentsSection({ issueId }: CommentsSectionProps) {
  const { data: comments, isLoading } = useComments(issueId);
  const addComment = useAddComment(issueId);
  const updateComment = useUpdateComment(issueId);
  const deleteComment = useDeleteComment(issueId);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, []);

  function handleAddComment() {
    if (!newContent.trim()) return;
    addComment.mutate(
      { content: newContent.trim() },
      {
        onSuccess: () => {
          setNewContent("");
        },
      }
    );
  }

  function handleStartEdit(commentId: string, content: string) {
    setEditingId(commentId);
    setEditContent(content);
    setDeleteConfirmId(null);
  }

  function handleSaveEdit(commentId: string) {
    if (!editContent.trim()) return;
    updateComment.mutate(
      { commentId, content: editContent.trim() },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditContent("");
        },
      }
    );
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  function handleDelete(commentId: string) {
    deleteComment.mutate(
      { commentId },
      {
        onSuccess: () => {
          setDeleteConfirmId(null);
        },
      }
    );
  }

  return (
    <div className="border-t pt-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-medium text-slate-700">
          Comments {comments ? `(${comments.length})` : ""}
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Comment list */}
          {comments && comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  {editingId === comment.id ? (
                    /* Edit mode */
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        autoFocus
                        aria-label="Edit comment"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(comment.id)}
                          disabled={updateComment.isPending}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Read mode */
                    <>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">
                            {comment.author}
                          </span>
                          <span>
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                          {comment.editedAt && (
                            <span className="italic text-slate-400">
                              (edited)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              handleStartEdit(comment.id, comment.content)
                            }
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {deleteConfirmId === comment.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-red-600"
                                onClick={() => handleDelete(comment.id)}
                                disabled={deleteComment.isPending}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setDeleteConfirmId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                              onClick={() => setDeleteConfirmId(comment.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-slate-600">
                        {comment.content}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-slate-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-base font-medium text-slate-900 mb-2">No comments yet</h4>
              <p className="text-slate-500 text-sm mb-4">Be the first to add a comment</p>
            </div>
          )}

          {/* Add comment form */}
          <div className="space-y-2">
            <label htmlFor="new-comment" className="sr-only">
              Add a comment
            </label>
            <Textarea
              id="new-comment"
              ref={commentInputRef}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              aria-label="Add a comment"
              aria-describedby="comment-hint"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleAddComment();
                }
              }}
            />
            <p
              id="comment-hint"
              className="text-xs text-slate-500"
            >
              Press Enter+Cmd or Enter+Ctrl to submit
            </p>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!newContent.trim() || addComment.isPending}
              >
                {addComment.isPending ? "Adding..." : "Add Comment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
