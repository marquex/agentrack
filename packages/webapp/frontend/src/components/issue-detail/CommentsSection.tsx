import { useState } from "react";
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

  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
            <p className="py-4 text-center text-sm text-slate-400">
              No comments yet. Add the first comment below.
            </p>
          )}

          {/* Add comment form */}
          <div className="space-y-2">
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleAddComment();
                }
              }}
            />
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
