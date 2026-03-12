import type { ExperiencePackStatus } from "@prisma/client";

export type StudioPayload = {
  packs: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    coverImageUrl: string | null;
    status: ExperiencePackStatus;
    isSelectable: boolean;
    sortOrder: number;
    previewablePageCount: number;
    activeUserCount: number;
    createdAt: string;
    updatedAt: string;
    pages: Array<{
      id: string;
      routeKey: string;
      title: string;
      notes: string | null;
      viewportLabel: string | null;
      imageUrl: string;
      originalFilename: string | null;
      fileSizeBytes: number | null;
      isPublished: boolean;
      previewHref: string;
      routeLabel: string;
      pathname: string;
      updatedAt: string;
    }>;
  }>;
  routeCatalog: Array<{
    key: string;
    label: string;
    pathname: string;
    summary: string;
  }>;
  statusCatalog: Array<{
    value: ExperiencePackStatus;
    label: string;
    summary: string;
  }>;
};

export type PackDraft = {
  name: string;
  slug: string;
  description: string;
  status: ExperiencePackStatus;
  isSelectable: boolean;
  coverImageUrl: string;
};

export type UploadDraft = {
  experiencePackId: string;
  routeKey: string;
  title: string;
  notes: string;
  viewportLabel: string;
};

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : "-";
}

export function formatBytes(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildImmersivePreviewHref(previewHref: string): string {
  return `${previewHref.replace(/\/$/, "")}/app`;
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      response.status === 413
        ? "Upload rejected by the server because the file is too large."
        : payload && typeof payload === "object" && "message" in payload
          ? String(payload.message)
          : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}
