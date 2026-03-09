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

const sha = safeGitShort();
const ts = Date.now();
const version = `ws-pwa-${sha}-${ts}`;

// Ensure public exists
fs.mkdirSync(pub, { recursive: true });

// 1) Write a version JS file (handy for debugging)
fs.writeFileSync(
  swVerPath,
  `// generated\nself.__WS_VERSION__=${JSON.stringify(version)};\n`,
  "utf8",
);

console.log(`sw-version: ${version}`);
