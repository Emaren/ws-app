// scripts/gen-sw-version.mjs
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
}

function safeGitShort() {
  try {
    return sh("git rev-parse --short HEAD");
  } catch {
    return "nogit";
  }
}

const root = path.resolve(process.cwd());
const pub = path.join(root, "public");
const swVerPath = path.join(pub, "sw-version.js");
const buildMetaPath = path.join(pub, "build-meta.json");
const packageJsonPath = path.join(root, "package.json");

const sha = safeGitShort();
const fullSha = (() => {
  try {
    return sh("git rev-parse HEAD");
  } catch {
    return null;
  }
})();
const gitBranch = (() => {
  try {
    return sh("git rev-parse --abbrev-ref HEAD");
  } catch {
    return null;
  }
})();
const ts = Date.now();
const version = `ws-pwa-${sha}-${ts}`;
const buildId = `ws-build-${sha}-${ts}`;
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Ensure public exists
fs.mkdirSync(pub, { recursive: true });

// 1) Write a version JS file (handy for debugging)
fs.writeFileSync(
  swVerPath,
  `// generated\nself.__WS_VERSION__=${JSON.stringify(version)};\n`,
  "utf8",
);

const buildMeta = {
  app: packageJson.name || "ws-app",
  packageVersion: packageJson.version || "0.0.0",
  buildId,
  pwaVersion: version,
  gitShaShort: sha === "nogit" ? null : sha,
  gitShaFull: fullSha,
  gitBranch,
  builtAt: new Date(ts).toISOString(),
  builtAtEpochMs: ts,
  nodeVersion: process.version,
  nextVersion: packageJson.dependencies?.next || null,
  reactVersion: packageJson.dependencies?.react || null,
  source: "generated",
};

fs.writeFileSync(buildMetaPath, `${JSON.stringify(buildMeta, null, 2)}\n`, "utf8");

console.log(`sw-version: ${version}`);
console.log(`build-meta: ${buildId}`);
