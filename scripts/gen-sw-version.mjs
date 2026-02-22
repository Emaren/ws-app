import { execSync } from "node:child_process";
import fs from "node:fs";

function getSha() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return `nogit-${Date.now()}`;
  }
}

const sha = getSha();
const version = `ws-pwa-${sha}`;

fs.writeFileSync(
  new URL("../public/sw-version.js", import.meta.url),
  `self.__WS_VERSION__ = "${version}";\n`,
  "utf8",
);

console.log(`sw-version: ${version}`);