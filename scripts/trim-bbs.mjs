// scripts/trim-bbs.mjs
import sharp from "sharp";

// input/output
const IN  = "public/bbs.png";                    // your original
const OUT = "public/bbs.adcard.center.v4.png";   // new name to bust caches

// target = card inner box (w - 2*pad, h - 2*pad)
const TARGET_W = 292;  // 328 - 2*8
const TARGET_H = 134;  // 170 - 2*8

// OPTIONAL: tiny internal padding (in pixels) after trimming.
// Set to 0 if you want to hug the edges.
const pad = { top: 4, right: 8, bottom: 4, left: 8 };

const img = sharp(IN);

// 1) trim stray transparent pixels
const trimmed = img.trim({ threshold: 10 });

// 2) add a touch of padding (transparent) so the oval isn’t kissing the border
const padded = trimmed.extend({
  ...pad,
  background: { r: 0, g: 0, b: 0, alpha: 0 },
});

// 3) resize into our exact inner box; 'contain' preserves aspect and centers
await padded
  .resize({
    width: TARGET_W,
    height: TARGET_H,
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    withoutEnlargement: false, // allow upscaling a bit if needed
  })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log("Wrote", OUT);
