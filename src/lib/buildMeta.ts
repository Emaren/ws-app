import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

export type BuildMetaSource = "generated" | "package_fallback";

export interface BuildMeta {
  app: string;
  packageVersion: string;
  buildId: string;
  pwaVersion: string | null;
  gitShaShort: string | null;
  gitShaFull: string | null;
  gitBranch: string | null;
  builtAt: string | null;
  builtAtEpochMs: number | null;
  nodeVersion: string;
  nextVersion: string | null;
  reactVersion: string | null;
  source: BuildMetaSource;
}

const BUILD_META_PATH = path.join(process.cwd(), "public", "build-meta.json");
const PACKAGE_JSON_PATH = path.join(process.cwd(), "package.json");

let cachedBuildMetaPromise: Promise<BuildMeta> | null = null;

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function readPackageFallback(): Promise<BuildMeta> {
  try {
    const raw = await fs.readFile(PACKAGE_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      name?: unknown;
      version?: unknown;
      dependencies?: Record<string, unknown>;
    };

    return {
      app: asTrimmedString(parsed.name) ?? "ws-app",
      packageVersion: asTrimmedString(parsed.version) ?? "0.0.0",
      buildId: "local-dev-unbuilt",
      pwaVersion: null,
      gitShaShort: null,
      gitShaFull: null,
      gitBranch: null,
      builtAt: null,
      builtAtEpochMs: null,
      nodeVersion: process.version,
      nextVersion: asTrimmedString(parsed.dependencies?.next),
      reactVersion: asTrimmedString(parsed.dependencies?.react),
      source: "package_fallback",
    };
  } catch {
    return {
      app: "ws-app",
      packageVersion: "0.0.0",
      buildId: "local-dev-unbuilt",
      pwaVersion: null,
      gitShaShort: null,
      gitShaFull: null,
      gitBranch: null,
      builtAt: null,
      builtAtEpochMs: null,
      nodeVersion: process.version,
      nextVersion: null,
      reactVersion: null,
      source: "package_fallback",
    };
  }
}

function normalizeGeneratedBuildMeta(input: unknown): BuildMeta | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const app = asTrimmedString(record.app);
  const packageVersion = asTrimmedString(record.packageVersion);
  const buildId = asTrimmedString(record.buildId);
  const nodeVersion = asTrimmedString(record.nodeVersion);

  if (!app || !packageVersion || !buildId || !nodeVersion) {
    return null;
  }

  const source = asTrimmedString(record.source) === "generated"
    ? "generated"
    : "package_fallback";
  const builtAtEpochMs =
    typeof record.builtAtEpochMs === "number" && Number.isFinite(record.builtAtEpochMs)
      ? record.builtAtEpochMs
      : null;

  return {
    app,
    packageVersion,
    buildId,
    pwaVersion: asTrimmedString(record.pwaVersion),
    gitShaShort: asTrimmedString(record.gitShaShort),
    gitShaFull: asTrimmedString(record.gitShaFull),
    gitBranch: asTrimmedString(record.gitBranch),
    builtAt: asTrimmedString(record.builtAt),
    builtAtEpochMs,
    nodeVersion,
    nextVersion: asTrimmedString(record.nextVersion),
    reactVersion: asTrimmedString(record.reactVersion),
    source,
  };
}

async function loadBuildMeta(): Promise<BuildMeta> {
  const fallback = await readPackageFallback();

  try {
    const raw = await fs.readFile(BUILD_META_PATH, "utf8");
    const parsed = normalizeGeneratedBuildMeta(JSON.parse(raw));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getBuildMeta(): Promise<BuildMeta> {
  if (!cachedBuildMetaPromise) {
    cachedBuildMetaPromise = loadBuildMeta();
  }

  return cachedBuildMetaPromise;
}
