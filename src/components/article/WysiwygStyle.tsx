// src/components/article/WysiwygStyle.tsx
import { WYSIWYG_CSS } from "@/components/editor/wysiwygStyle";

/**
 * Shared WYSIWYG styles for article body.
 * NOTE: Image width rules (e.g., 50% desktop / 100% mobile) live in globals.css.
 * This file keeps only non-size, theme-adaptive polish.
 */
const EXTRA_CSS = `
/* Base rhythm */
.wysiwyg{ line-height:1.7; color:inherit; }
.wysiwyg p{ margin-block:0 1rem; }

/* Headings */
.wysiwyg :is(h2,h3,h4){
  margin:2rem 0 .75rem; line-height:1.25; letter-spacing:-0.01em; font-weight:700;
}
.wysiwyg h2{ font-size:clamp(1.375rem,2.2vw,1.75rem); }
.wysiwyg h3{ font-size:clamp(1.125rem,1.8vw,1.375rem); }
.wysiwyg h4{ font-size:clamp(1rem,1.6vw,1.125rem); }

/* Lists */
.wysiwyg :is(ul,ol){ margin:0 0 1rem 1.25rem; padding-left:1.25rem; }
.wysiwyg li{ margin:.25rem 0; }

/* Links */
.wysiwyg a{ text-decoration:underline; text-underline-offset:2px; }

/* Images — non-size safety (perf hints included) */
.wysiwyg :is(img,a>img,figure>img){
  display:block; max-width:100%; height:auto; border-radius:.75rem;
  content-visibility:auto; contain-intrinsic-size:800px 600px;
}

/* Figures & captions */
.wysiwyg figure{ margin:1.25rem 0; }
.wysiwyg figcaption{
  margin-top:.5rem; font-size:.9375rem; line-height:1.4;
  color:color-mix(in oklab,currentColor 65%,transparent);
}

/* Blockquotes (theme-adaptive via currentColor) */
.wysiwyg blockquote{
  margin:1.25rem 0; padding:.9rem 1.1rem;
  border-left:3px solid color-mix(in oklab,currentColor 35%,transparent);
  background:color-mix(in oklab,currentColor 8%,transparent);
  border-radius:.6rem;
}

/* Code */
.wysiwyg code{
  font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
  font-size:.9375rem; background:color-mix(in oklab,currentColor 16%,transparent);
  padding:.1rem .35rem; border-radius:.375rem;
}

/* Tables */
.wysiwyg table{
  width:100%; border-collapse:collapse; margin:1rem 0 1.25rem;
  font-size:.96rem; border-radius:.6rem; overflow:hidden;
}
.wysiwyg :is(th,td){
  border:1px solid color-mix(in oklab,currentColor 22%,transparent);
  padding:.5rem .75rem; text-align:left; vertical-align:top;
}
.wysiwyg thead th{ background:color-mix(in oklab,currentColor 8%,transparent); font-weight:600; }
.wysiwyg tbody tr:nth-child(odd){ background:color-mix(in oklab,currentColor 6%,transparent); }
`;

export default function WysiwygStyle() {
  return (
    <style
      id="wysiwyg-shared-css-article"
      dangerouslySetInnerHTML={{ __html: `${WYSIWYG_CSS}\n${EXTRA_CSS}` }}
    />
  );
}
