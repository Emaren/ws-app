// src/components/article/WysiwygStyle.tsx
"use client";
import { useEffect } from "react";
import { WYSIWYG_CSS } from "@/components/editor/wysiwygStyle";

export default function WysiwygStyle() {
  useEffect(() => {
    // inject once per page
    const id = "wysiwyg-shared-css";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      /* Scope to .wysiwyg so it only affects article bodies */
      .wysiwyg { padding: 1rem; }
      .wysiwyg ${WYSIWYG_CSS
        // remove the 'body' selector since we’re scoping
        .replace(/(^|\n)\s*body\s*\{/,'\n.wysiwyg{')
        // make other top-level selectors scope to .wysiwyg
        .replace(/\n([ahulobtmc][^\{]+)\{/g, '\n.wysiwyg $1{')
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
}
