import { hasAnyRole, RBAC_ROLE_GROUPS, type AppRole } from "@/lib/rbac";

export const ARTICLE_STATUSES = [
  "DRAFT",
  "REVIEW",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type ArticleLifecycleStatus = (typeof ARTICLE_STATUSES)[number];

const ARTICLE_STATUS_TRANSITIONS: Record<ArticleLifecycleStatus, readonly ArticleLifecycleStatus[]> = {
  DRAFT: ["REVIEW", "ARCHIVED"],
  REVIEW: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export function normalizeArticleStatus(
  input: string | null | undefined,
): ArticleLifecycleStatus | undefined {
  if (!input) {
    return undefined;
  }

  const upper = input.trim().toUpperCase();
  if (ARTICLE_STATUSES.includes(upper as ArticleLifecycleStatus)) {
    return upper as ArticleLifecycleStatus;
  }

  return undefined;
}

export function isArticleStatus(value: string | null | undefined): value is ArticleLifecycleStatus {
  return normalizeArticleStatus(value) !== undefined;
}

export function isStaffRole(role: AppRole | undefined): boolean {
  return hasAnyRole(role, RBAC_ROLE_GROUPS.staff);
}

export function canReadArticle(
  status: ArticleLifecycleStatus,
  role: AppRole | undefined,
  isOwner: boolean,
): boolean {
  if (status === "PUBLISHED") {
    return true;
  }

  if (isStaffRole(role)) {
    return true;
  }

  return role === "CONTRIBUTOR" && isOwner;
}

export function isPubliclyVisibleArticle(
  status: ArticleLifecycleStatus,
  publishedAt: Date | string | null | undefined,
): boolean {
  if (status === "PUBLISHED") {
    return true;
  }

  if (status === "ARCHIVED") {
    return false;
  }

  return Boolean(publishedAt);
}

export function canEditArticleContent(
  status: ArticleLifecycleStatus,
  role: AppRole | undefined,
  isOwner: boolean,
): boolean {
  if (isStaffRole(role)) {
    return true;
  }

  return role === "CONTRIBUTOR" && isOwner && (status === "DRAFT" || status === "REVIEW");
}

export function canDeleteArticle(
  status: ArticleLifecycleStatus,
  role: AppRole | undefined,
  isOwner: boolean,
): boolean {
  if (isStaffRole(role)) {
    return true;
  }

  return role === "CONTRIBUTOR" && isOwner && (status === "DRAFT" || status === "REVIEW");
}

export function canSetCreateStatus(
  status: ArticleLifecycleStatus,
  role: AppRole | undefined,
): boolean {
  if (isStaffRole(role)) {
    return true;
  }

  return role === "CONTRIBUTOR" && (status === "DRAFT" || status === "REVIEW");
}

export function canTransitionArticleStatus(
  currentStatus: ArticleLifecycleStatus,
  nextStatus: ArticleLifecycleStatus,
  role: AppRole | undefined,
  isOwner: boolean,
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  if (isStaffRole(role)) {
    return ARTICLE_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
  }

  if (role === "CONTRIBUTOR" && isOwner) {
    return (
      (currentStatus === "DRAFT" && nextStatus === "REVIEW") ||
      (currentStatus === "REVIEW" && nextStatus === "DRAFT")
    );
  }

  return false;
}

export function statusBadgeLabel(status: ArticleLifecycleStatus): string {
  if (status === "DRAFT") return "Draft";
  if (status === "REVIEW") return "In Review";
  if (status === "PUBLISHED") return "Published";
  return "Archived";
}

export function statusBadgeClassName(status: ArticleLifecycleStatus): string {
  if (status === "PUBLISHED") {
    return "bg-green-600/15 text-green-500 border border-green-600/30";
  }

  if (status === "REVIEW") {
    return "bg-blue-600/15 text-blue-400 border border-blue-600/30";
  }

  if (status === "ARCHIVED") {
    return "bg-neutral-600/15 text-neutral-300 border border-neutral-600/30";
  }

  return "bg-yellow-600/15 text-yellow-400 border border-yellow-600/30";
}

export function derivePublishedAtPatch(
  currentPublishedAt: Date | null,
  nextStatus: ArticleLifecycleStatus,
): Date | null {
  if (nextStatus === "PUBLISHED") {
    return currentPublishedAt ?? new Date();
  }

  if (nextStatus === "ARCHIVED") {
    return null;
  }

  return null;
}
