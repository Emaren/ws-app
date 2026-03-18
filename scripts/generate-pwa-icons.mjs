import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const sourceIcon = path.join(projectRoot, "public", "icons", "app-icon-source.png");
const iconsDir = path.join(projectRoot, "public", "icons");
const appleTouchTarget = path.join(projectRoot, "public", "apple-touch-icon.png");
const applePrecomposedTarget = path.join(
  projectRoot,
  "public",
  "apple-touch-icon-precomposed.png",
);

function centerOffset(canvasSize, contentSize) {
  return Math.max(0, Math.floor((canvasSize - contentSize) / 2));
}

async function renderTrimmedSquare(size, options = {}) {
  const {
    padding = 0,
    background = { r: 0, g: 0, b: 0, alpha: 0 },
  } = options;
  const innerSize = Math.max(1, size - padding * 2);

  const foreground = await sharp(sourceIcon)
    .trim()
    .resize(innerSize, innerSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  }).composite([{ input: foreground, left: centerOffset(size, innerSize), top: centerOffset(size, innerSize) }]);
}

async function ensureReadable(filePath) {
  await fs.access(filePath);
}

async function writeStandardIcon(size) {
  const target = path.join(iconsDir, `icon-${size}.png`);
  const image = await renderTrimmedSquare(size);
  await image.png({ compressionLevel: 9 }).toFile(target);
  return target;
}

async function writeMaskableIcon() {
  const target = path.join(iconsDir, "maskable-512.png");
  const image = await renderTrimmedSquare(512, {
    padding: 28,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  await image.png({ compressionLevel: 9 }).toFile(target);

  return target;
}

async function writeAppleTouchIcon() {
  for (const target of [appleTouchTarget, applePrecomposedTarget]) {
    const image = await renderTrimmedSquare(180, {
      padding: 0,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
    await image.png({ compressionLevel: 9 }).toFile(target);
  }
}

async function main() {
  await ensureReadable(sourceIcon);
  await fs.mkdir(iconsDir, { recursive: true });

  const outputs = await Promise.all([
    writeStandardIcon(192),
    writeStandardIcon(512),
    writeStandardIcon(1024),
  ]);
  const maskable = await writeMaskableIcon();
  await writeAppleTouchIcon();

  const written = [...outputs, maskable, appleTouchTarget, applePrecomposedTarget];
  for (const filePath of written) {
    const stat = await fs.stat(filePath);
    console.log(`${path.relative(projectRoot, filePath)} (${stat.size} bytes)`);
  }
}

main().catch((error) => {
  console.error("PWA icon generation failed:", error);
  process.exit(1);
});
