// src/components/editor/RichField.tsx
"use client";

import { Editor } from "@tinymce/tinymce-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { WYSIWYG_CSS } from "./wysiwygStyle";

type Theme = "auto" | "light" | "dark";

type Props = {
  value: string;
  onChange: (html: string) => void;
  height?: number;
  /** Editor theme: "auto" follows site theme; or force "light"/"dark" */
  theme?: Theme;
};

export default function RichField({
  value,
  onChange,
  height = 420,
  theme = "auto",
}: Props) {
  const ref = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  // Track both sources of truth:
  // 1) <html class="dark">
  // 2) OS / browser prefers-color-scheme
  const [htmlHasDark, setHtmlHasDark] = useState(false);
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Observe <html class="dark"> changes
    const html = document.documentElement;
    const updateHtmlDark = () => setHtmlHasDark(html.classList.contains("dark"));
    updateHtmlDark();
    const obs = new MutationObserver(updateHtmlDark);
    obs.observe(html, { attributes: true, attributeFilter: ["class"] });

    // Observe prefers-color-scheme changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const updateMq = () => setPrefersDark(!!mq.matches);
    updateMq();
    mq.addEventListener?.("change", updateMq);

    return () => {
      obs.disconnect();
      mq.removeEventListener?.("change", updateMq);
    };
  }, []);

  const isDark = useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    // auto
    return htmlHasDark || prefersDark;
  }, [theme, htmlHasDark, prefersDark]);

  // TinyMCE 8 CDN
  const CDN = "https://cdn.jsdelivr.net/npm/tinymce@8.2.0";

  if (!mounted) {
    return (
      <div className="border rounded h-[420px] bg-black/5 dark:bg-white/5 animate-pulse" />
    );
  }

  // Ensure readable canvas inside the iframe regardless of built-in styles
  // Use !important to beat Tiny content CSS if it sets a background.
  const baseBody = isDark
    ? "body.mce-content-body{background:#0a0a0a!important;color:#e5e5e5!important}"
    : "body.mce-content-body{background:#ffffff!important;color:#111827!important}";
  const linkTone = isDark
    ? "a{color:#93c5fd}"
    : "a{color:#2563eb}";

  return (
    <Editor
      key={`tinymce-editor-${isDark ? "dark" : "light"}`} // force re-init on theme flip
      tinymceScriptSrc={`${CDN}/tinymce.min.js`}
      licenseKey="gpl"
      onInit={(_, editor) => (ref.current = editor)}
      value={value}
      onEditorChange={(content) => onChange(content)}
      init={{
        base_url: CDN,
        suffix: ".min",

        height,
        menubar: false,
        branding: false,
        statusbar: false,

        // Free plugins only
        plugins: "lists advlist table link code",
        toolbar:
          "undo redo | blocks | bold italic underline | forecolor backcolor removeformat | " +
          "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table link | code",

        // UI + content theme
        skin: isDark ? "oxide-dark" : "oxide",
        content_css: isDark ? "dark" : "default",

        // Match site reader CSS + explicit body/link colors
        content_style: `${WYSIWYG_CSS}\n${baseBody}\n${linkTone}`,

        paste_data_images: false,
        convert_urls: false,

        // Keep HTML tight/safe
        valid_elements:
          "p,br,strong/b,em/i,u,span[style],a[href|target|rel|title]," +
          "h1,h2,h3,h4,ul,ol,li,blockquote,hr," +
          "table,thead,tbody,tr,th,td,img[src|alt|title|width|height]",
        valid_styles: {
          "*":
            "color,background-color,text-align,font-size,font-family," +
            "font-weight,font-style,text-decoration",
        },
        block_formats: "Paragraph=p; H1=h1; H2=h2; H3=h3; H4=h4",

        external_plugins: {}, // no premium
      }}
    />
  );
}
