// scripts/trim-bbs.mjs
import sharp from "sharp";

const IN  = "public/bbs.png";
const OUT = "public/bbs.trim.v6.png";   // new name to bust cache

await sharp(IN)
  .trim({ threshold: 10 })
  .extend({
    top: 375, bottom: 0, left: 0, right: 0,  // was 43; +13px drops the art ~13px
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log("Wrote", OUT);
