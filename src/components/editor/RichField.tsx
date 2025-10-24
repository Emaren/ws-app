// src/components/editor/RichField.tsx
"use client";

import { Editor } from "@tinymce/tinymce-react";
import { useEffect, useRef, useState } from "react";
import { WYSIWYG_CSS } from "./wysiwygStyle";

type Props = {
  value: string;
  onChange: (html: string) => void;
  height?: number;
};

export default function RichField({ value, onChange, height = 420 }: Props) {
  const ref = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const CDN = "https://cdn.jsdelivr.net/npm/tinymce@8.2.0";

  if (!mounted) {
    return <div className="border rounded h-[420px] bg-black/5 dark:bg-white/5 animate-pulse" />;
  }

  return (
    <Editor
      key="tinymce-editor"
      tinymceScriptSrc={`${CDN}/tinymce.min.js`}
      onInit={(_, editor) => (ref.current = editor)}
      value={value}
      onEditorChange={(content) => onChange(content)}
      init={{
        licenseKey: "gpl",
        base_url: CDN,
        suffix: ".min",

        height,
        menubar: false,
        branding: false,
        statusbar: false,

        plugins: "lists advlist table link code",
        toolbar:
          "undo redo | blocks | bold italic underline | forecolor backcolor removeformat | " +
          "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table link | code",

        // <- the exact same CSS the viewer uses
        content_style: WYSIWYG_CSS,

        paste_data_images: false,
        convert_urls: false,
        valid_elements:
          "p,br,strong/b,em/i,u,span[style],a[href|target|rel|title]," +
          "h1,h2,h3,h4,ul,ol,li,blockquote,hr," +
          "table,thead,tbody,tr,th,td,img[src|alt|title|width|height]",
        valid_styles: {
          "*":
            "color,background-color,text-align,font-size,font-family," +
            "font-weight,font-style,text-decoration"
        },
        block_formats: "Paragraph=p; H1=h1; H2=h2; H3=h3; H4=h4",
      }}
    />
  );
}
