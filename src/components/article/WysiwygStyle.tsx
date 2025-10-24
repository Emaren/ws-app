// src/components/article/WysiwygStyle.tsx
"use client";

import { WYSIWYG_CSS } from "@/components/editor/wysiwygStyle";

export default function WysiwygStyle() {
  // The CSS itself is scoped with :where(.wysiwyg, body)
  return (
    <style id="wysiwyg-shared-css" dangerouslySetInnerHTML={{ __html: WYSIWYG_CSS }} />
  );
}
