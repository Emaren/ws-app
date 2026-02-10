import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const sourceIcon = path.join(projectRoot, "public", "hh.tight.v3.png");
const iconsDir = path.join(projectRoot, "public", "icons");
const appleTouchTarget = path.join(projectRoot, "public", "apple-touch-icon.png");
const applePrecomposedTarget = path.join(
  projectRoot,
  "public",
  "apple-touch-icon-precomposed.png",
);

async function ensureReadable(filePath) {
  await fs.access(filePath);
}

async function writeStandardIcon(size) {
  const target = path.join(iconsDir, `icon-${size}.png`);
  await sharp(sourceIcon)
    .resize(size, size, {
      fit: "contain",
      background: { r: 10, g: 10, b: 10, alpha: 0 },
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 9 })
    .toFile(target);
  return target;
}

async function writeMaskableIcon() {
  const target = path.join(iconsDir, "maskable-512.png");

  const foreground = await sharp(sourceIcon)
    .resize(360, 360, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    },
  })
    .composite([{ input: foreground, left: 76, top: 76 }])
    .png({ compressionLevel: 9 })
    .toFile(target);

  return target;
}

async function writeAppleTouchIcon() {
  const foreground = await sharp(sourceIcon)
    .resize(140, 140, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  for (const target of [appleTouchTarget, applePrecomposedTarget]) {
    await sharp({
      create: {
        width: 180,
        height: 180,
        channels: 4,
        background: { r: 10, g: 10, b: 10, alpha: 1 },
      },
    })
      .composite([{ input: foreground, left: 20, top: 20 }])
      .png({ compressionLevel: 9 })
      .toFile(target);
  }
}

async function main() {
  await ensureReadable(sourceIcon);
  await fs.mkdir(iconsDir, { recursive: true });

  const outputs = await Promise.all([writeStandardIcon(192), writeStandardIcon(512)]);
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
