// src/components/article/WysiwygStyle.tsx
"use client";

import { WYSIWYG_CSS } from "@/components/editor/wysiwygStyle";

/**
 * Shared WYSIWYG styles for article body.
 * NOTE: Image width rules (50% desktop / 100% mobile) now live ONLY in globals.css
 * to avoid duplication and drift. This file intentionally contains no image sizing.
 */
const EXTRA_CSS = `
/* Base text rhythm refinements (non-size) */
.wysiwyg {
  line-height: 1.7;
  color: #171717;
}
.wysiwyg p { margin: 0 0 1rem; }
.wysiwyg h2, .wysiwyg h3, .wysiwyg h4 {
  margin: 2rem 0 0.75rem;
  line-height: 1.25;
  letter-spacing: -0.01em;
}
.wysiwyg h2 { font-size: clamp(1.375rem, 2.2vw, 1.75rem); }
.wysiwyg h3 { font-size: clamp(1.125rem, 1.8vw, 1.375rem); }
.wysiwyg h4 { font-size: clamp(1rem, 1.6vw, 1.125rem); }

.wysiwyg ul, .wysiwyg ol { margin: 0 0 1rem 1.25rem; }
.wysiwyg li { margin: 0.25rem 0; }

/* Links */
.wysiwyg a {
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Images — no width here; only non-size safety */
.wysiwyg img,
.wysiwyg picture > img,
.wysiwyg a > img,
.wysiwyg figure > img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 0.75rem;
}

/* Optional opt-outs/variants that do NOT set widths */
.wysiwyg img[data-full="true"] {
  /* sizing controlled by globals.css; this only keeps shape */
  border-radius: 0.75rem;
}

/* Figures & captions */
.wysiwyg figure { margin: 1.25rem 0; }
.wysiwyg figcaption {
  margin-top: 0.5rem;
  font-size: 0.9375rem;
  line-height: 1.4;
  color: rgba(0,0,0,0.6);
}

/* Blockquotes */
.wysiwyg blockquote {
  margin: 1.25rem 0;
  padding-left: 1rem;
  border-left: 3px solid rgba(0,0,0,0.08);
  color: rgba(0,0,0,0.75);
}

/* Code */
.wysiwyg code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.9375rem;
  background: rgba(0,0,0,0.04);
  padding: 0.1rem 0.35rem;
  border-radius: 0.375rem;
}

/* Tables */
.wysiwyg table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
.wysiwyg th, .wysiwyg td {
  border: 1px solid rgba(0,0,0,0.08);
  padding: 0.5rem 0.75rem;
  text-align: left;
}
.wysiwyg thead th {
  background: rgba(0,0,0,0.03);
  font-weight: 600;
}

/* Dark mode softening */
@media (prefers-color-scheme: dark) {
  .wysiwyg { color: #e5e5e5; }
  .wysiwyg a { color: #d1d5db; }
  .wysiwyg figcaption { color: rgba(255,255,255,0.7); }
  .wysiwyg blockquote {
    border-left-color: rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.85);
  }
  .wysiwyg code { background: rgba(255,255,255,0.08); }
  .wysiwyg th, .wysiwyg td { border-color: rgba(255,255,255,0.12); }
  .wysiwyg thead th { background: rgba(255,255,255,0.06); }
}
`;

export default function WysiwygStyle() {
  // Append AFTER the base editor CSS so these win.
  return (
    <style
      id="wysiwyg-shared-css-article"
      dangerouslySetInnerHTML={{ __html: `${WYSIWYG_CSS}\n${EXTRA_CSS}` }}
    />
  );
}
