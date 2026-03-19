export const ARTICLE_COMMENT_BODY_MIN_LENGTH = 3;
export const ARTICLE_COMMENT_BODY_MAX_LENGTH = 800;
export const ARTICLE_COMMENT_AUTHOR_MAX_LENGTH = 40;
export const ARTICLE_COMMENT_LIST_LIMIT = 40;

export type PublicArticleComment = {
  id: string;
  authorName: string;
  authorKind: "member" | "guest";
  body: string;
  createdAtISOString: string;
  createdAtLabel: string;
};

export type ArticleCommentRewardOutcome = {
  eligible: boolean;
  granted: boolean;
  dailyLimitReached: boolean;
  token: "STONE";
  amount: number;
};
