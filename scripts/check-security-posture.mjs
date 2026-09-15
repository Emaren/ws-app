import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const [name, expected] of [["next", "15.5.24"], ["react", "19.1.9"], ["react-dom", "19.1.9"]]) {
  if (pkg.dependencies?.[name] !== expected) throw new Error(`${name} must remain pinned to ${expected}`);
}
const unit = fs.readFileSync("ops/systemd/wheatandstone-app.service", "utf8");
for (const rule of [
  "User=tony", "NoNewPrivileges=yes", "PrivateTmp=yes", "ProtectSystem=strict",
  "ProtectHome=yes", "CapabilityBoundingSet=", "NoExecPaths=/tmp /var/tmp /dev/shm",
  "ReadWritePaths=/var/www/WheatAndStone/ws-app/public/uploads/experience-studio",
]) {
  if (!unit.includes(rule)) throw new Error(`missing hardening rule: ${rule}`);
}
const workspace = fs.readFileSync("pnpm-workspace.yaml", "utf8");
for (const line of [
  "postcss: '8.5.28'",
  "browserslist: '4.28.9'",
  "baseline-browser-mapping: '2.11.23'",
  "deepmerge-ts: '8.0.2'",
]) {
  if (!workspace.includes(line)) throw new Error(`missing security override: ${line}`);
}
for (const name of ["@prisma/client", "@prisma/engines", "bcrypt", "esbuild", "prisma", "sharp", "unrs-resolver"]) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`['\"]?${escaped}['\"]?: true`).test(workspace)) throw new Error(`native build not explicitly approved: ${name}`);
}
console.log("WheatAndStone security posture PASS");
