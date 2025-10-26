// src/components/article/WysiwygStyle.tsx
"use client";

import { WYSIWYG_CSS } from "@/components/editor/wysiwygStyle";

/**
 * Strong, final overrides for images inside the article body (.wysiwyg).
 * - Force 50% width (centered) on desktop, 100% on small screens.
 * - Beat inline width/height attributes and styles.
 * - Opt-out: add data-full="true" to an <img>.
 */
const EXTRA_CSS = `
/* Super-specific selectors to beat other .wysiwyg img rules */
html body :where(.wysiwyg) :is(img, picture > img, a > img, figure > img):not([data-full="true"]) {
  display: block !important;
  margin-left: auto !important;
  margin-right: auto !important;

  width: 50% !important;
  max-width: 50% !important;

  height: auto !important;
  max-height: none !important;

  border-radius: 0.75rem !important;
}

/* If width/height were set via attributes, still clamp */
html body :where(.wysiwyg) :is(img[width], img[height]):not([data-full="true"]) {
  width: 50% !important;
  max-width: 50% !important;
  height: auto !important;
}

/* If inline styles set width, still clamp */
html body :where(.wysiwyg) :is(img[style*="width"]):not([data-full="true"]) {
  width: 50% !important;
  max-width: 50% !important;
  height: auto !important;
}

/* Mobile: images full width for readability */
@media (max-width: 768px) {
  html body :where(.wysiwyg) :is(img, picture > img, a > img, figure > img):not([data-full="true"]),
  html body :where(.wysiwyg) :is(img[width], img[height]):not([data-full="true"]),
  html body :where(.wysiwyg) :is(img[style*="width"]):not([data-full="true"]) {
    width: 100% !important;
    max-width: 100% !important;
  }
}
`;

export default function WysiwygStyle() {
  // Append our overrides AFTER the base CSS so they win.
  // Different id ensures this <style> doesn't get de-duped.
  return (
    <style
      id="wysiwyg-shared-css-article"
      dangerouslySetInnerHTML={{ __html: `${WYSIWYG_CSS}\n${EXTRA_CSS}` }}
    />
  );
}
