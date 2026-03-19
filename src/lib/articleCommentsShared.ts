export const ARTICLE_COMMENT_BODY_MIN_LENGTH = 3;
export const ARTICLE_COMMENT_BODY_MAX_LENGTH = 800;
export const ARTICLE_COMMENT_AUTHOR_MAX_LENGTH = 40;
export const ARTICLE_COMMENT_LIST_LIMIT = 40;

export type PublicArticleComment = {
  id: string;
  parentId: string | null;
  authorName: string;
  authorKind: "member" | "guest";
  body: string;
  createdAtISOString: string;
  createdAtLabel: string;
  replies: PublicArticleComment[];
};

export type ArticleCommentRewardOutcome = {
  eligible: boolean;
  granted: boolean;
  dailyLimitReached: boolean;
  token: "STONE";
  amount: number;
};

export function nestPublicArticleComments(
  comments: PublicArticleComment[],
): PublicArticleComment[] {
  const nodes = new Map<string, PublicArticleComment>();
  const roots: PublicArticleComment[] = [];

  for (const comment of comments) {
    nodes.set(comment.id, {
      ...comment,
      replies: [],
    });
  }

  for (const comment of comments) {
    const node = nodes.get(comment.id);
    if (!node) {
      continue;
    }

    if (comment.parentId) {
      const parent = nodes.get(comment.parentId);
      if (parent) {
        parent.replies.push(node);
        continue;
      }
    }

    roots.push(node);
  }

  return roots.reverse();
}

export function appendPublicArticleComment(
  comments: PublicArticleComment[],
  nextComment: PublicArticleComment,
): PublicArticleComment[] {
  const node: PublicArticleComment = {
    ...nextComment,
    replies: nextComment.replies ?? [],
  };

  if (!node.parentId) {
    return [node, ...comments];
  }

  let inserted = false;
  const updated = comments.map((comment) => {
    if (comment.id !== node.parentId) {
      return comment;
    }

    inserted = true;
    return {
      ...comment,
      replies: [...comment.replies, node],
    };
  });

  if (inserted) {
    return updated;
  }

  return [node, ...comments];
}

export function countPublicArticleComments(comments: PublicArticleComment[]): number {
  return comments.reduce(
    (total, comment) => total + 1 + countPublicArticleComments(comment.replies),
    0,
  );
}
