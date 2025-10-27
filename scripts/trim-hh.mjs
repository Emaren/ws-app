// scripts/trim-hh.mjs
// Trim the HH logo *tight* and emit exact-fit assets for your FloatAd.
// Usage:
//   node scripts/trim-hh.mjs [inputPath] [heightsCSV]
// Examples:
//   node scripts/trim-hh.mjs                 # uses public/hh.png and heights 140,148,156
//   node scripts/trim-hh.mjs public/hh.png 180,196,212

import fs from "node:fs/promises";
import sharp from "sharp";

const IN = process.argv[2] ?? "public/hh.png";
const heights = (process.argv[3] ?? "140,148,156")
  .split(",")
  .map((s) => parseInt(s.trim(), 10))
  .filter(Boolean);

const OUT_TIGHT = "public/hh.tight.v3.png";
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

(async () => {
  // 1) Aggressive trim to remove any halo so there’s ZERO internal padding
  const tightBuf = await sharp(IN)
    .trim({ threshold: 40 }) // higher => tighter crop
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(OUT_TIGHT, tightBuf);

  const meta = await sharp(tightBuf).metadata();
  const W = meta.width ?? 1;
  const H = meta.height ?? 1;
  const AR = W / H;

  // 2) For each requested height, output an exact-fit (no letterbox) image.
  //    Width is derived from the trimmed aspect ratio, so the card can match 1:1.
  const outs = [];
  for (const h of heights) {
    const w = Math.round(h * AR);
    const out = `public/hh.tight.h${h}.v3.png`;
    await sharp(tightBuf)
      .resize({ width: w, height: h, fit: "contain", background: TRANSPARENT })
      .png({ compressionLevel: 9 })
      .toFile(out);
    outs.push({ h, w, out });
  }

  // Logs + copy-paste props for FloatAd so the image fills the card exactly.
  console.log(`Trimmed: ${OUT_TIGHT} (${W}x${H})  AR=${AR.toFixed(4)}`);
  outs.forEach(({ h, w, out }) => console.log(`Wrote ${out} (${w}x${h})`));

  const [sm, md = outs[0], lg = outs[1] ?? outs[0]] = outs;

  console.log("\nSuggested <FloatAd> props (no internal padding, no gutters):");
  console.log(`  imageSrc="/hh.tight.h${lg.h}.v3.png"`);
  console.log(`  w={${sm.w}} mdW={${md.w}} lgW={${lg.w}}`);
  console.log(`  h={${sm.h}} mdH={${md.h}} lgH={${lg.h}}`);
  console.log(`  pad={0} intrinsic imgFit="contain"`);
  console.log(
    `  imgMaxH={${sm.h}} mdImgMaxH={${md.h}} lgImgMaxH={${lg.h}} imgClassName="w-full h-full max-w-none"`
  );
})().catch((err) => {
  console.error("trim-hh.mjs failed:", err);
  process.exit(1);
});
