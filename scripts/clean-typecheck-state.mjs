import { rmSync } from "node:fs";

// Clear all local Next build dirs so type generation never reads stale route files.
const paths = [".next", ".next-dev", ".next-preview", "tsconfig.tsbuildinfo"];

for (const path of paths) {
  rmSync(path, { recursive: true, force: true });
}
