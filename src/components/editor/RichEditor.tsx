// src/components/editor/RichEditor.tsx
"use client";

import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import DOMPurify from "isomorphic-dompurify";

/* ---------------- utils ---------------- */

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const ALLOWED_TAGS = [
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "a",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "hr",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const ALLOWED_ATTR = ["href", "title", "rel", "target", "src", "alt", "colspan", "rowspan"];

function sanitize(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "style"],
    KEEP_CONTENT: true,
  });
}

/* ---------------- component ---------------- */

type Theme = "auto" | "light" | "dark";

type Props = {
  /** Current HTML value */
  value: string;
  /** Called with sanitized HTML on every update */
  onChange: (html: string) => void;
  className?: string;
  /** If true, don't emit onChange when we programmatically set content */
  quietSet?: boolean;
  /** Editor theme: "auto" follows site theme; or force "light"/"dark" */
  theme?: Theme;
};

export default function RichEditor({
  value,
  onChange,
  className,
  quietSet,
  theme = "auto",
}: Props) {
  const forceLight = theme === "light";
  const forceDark = theme === "dark";

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
        protocols: ["http", "https", "mailto", "tel"],
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ inline: false }),
    ],
    content: sanitize(value || ""),
    onUpdate: ({ editor }) => {
      const html = sanitize(editor.getHTML());
      onChange(html);
    },
    editorProps: {
      attributes: {
        // Typographic baseline + theme handling.
        // auto  -> follows html.dark via dark:prose-invert
        // dark  -> always inverted
        // light -> never inverted
        class: cx(
          "prose max-w-none focus:outline-none min-h-[260px] px-3 py-2 bg-transparent selection:bg-amber-200/30",
          forceDark ? "prose-invert" : forceLight ? "" : "dark:prose-invert",
          "sm:prose-base prose-sm"
        ),
      },
      handlePaste: (_view, event) => {
        const html = event.clipboardData?.getData("text/html");
        if (html && html.trim()) {
          event.preventDefault();
          const clean = sanitize(html);
          editor?.commands.insertContent(clean);
          return true;
        }
        return false;
      },
    },
  });

  // Keep the editor in sync if parent value changes
  useEffect(() => {
    if (!editor) return;
    const current = sanitize(editor.getHTML());
    const incoming = sanitize(value || "");
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: !(quietSet ?? true) });
    }
  }, [value, editor, quietSet]);

  if (!editor) return null;

  // Wrapper colors (toolbar + content shell)
  const wrapperTone = forceDark
    ? "bg-neutral-950 text-neutral-100"
    : forceLight
    ? "bg-white text-neutral-900"
    : "bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";

  return (
    <div className={cx("border rounded-xl overflow-hidden", wrapperTone, className)}>
      <Toolbar editor={editor} theme={theme} />
      <div className="border-t">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/* ---------------- Toolbar ---------------- */

function Btn({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cx(
        "px-2 py-1 text-sm rounded-md border",
        active
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, theme }: { editor: Editor; theme: Theme }) {
  const forceLight = theme === "light";
  const forceDark = theme === "dark";

  const barTone = forceDark
    ? "bg-neutral-900 text-neutral-100"
    : forceLight
    ? "bg-neutral-50 text-neutral-900"
    : "bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100";

  return (
    <div className={cx("flex flex-wrap gap-2 p-2", barTone)}>
      <Btn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        B
      </Btn>
      <Btn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        I
      </Btn>
      <Btn
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        U
      </Btn>

      <div className="mx-2 h-6 w-px bg-neutral-200 dark:bg-neutral-800" />

      {[1, 2, 3, 4].map((lvl) => (
        <Btn
          key={lvl}
          active={editor.isActive("heading", { level: lvl })}
          onClick={() => editor.chain().focus().toggleHeading({ level: lvl as 1 | 2 | 3 | 4 }).run()}
          title={`Heading ${lvl}`}
        >
          H{lvl}
        </Btn>
      ))}

      <div className="mx-2 h-6 w-px bg-neutral-200 dark:bg-neutral-800" />

      <Btn
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bulleted list"
      >
        • List
      </Btn>
      <Btn
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        1. List
      </Btn>
      <Btn
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquote"
      >
        ❝ ❞
      </Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
        ———
      </Btn>

      <div className="mx-2 h-6 w-px bg-neutral-200 dark:bg-neutral-800" />

      <Btn
        onClick={() => {
          const url = window.prompt("Link URL");
          if (!url) return;
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url, target: "_blank", rel: "noopener noreferrer" })
            .run();
        }}
        title="Add link"
      >
        Link
      </Btn>
      <Btn onClick={() => editor.chain().focus().unsetLink().run()} title="Remove link">
        Unlink
      </Btn>

      <div className="mx-2 h-6 w-px bg-neutral-200 dark:bg-neutral-800" />

      <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo">
        ⎌
      </Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo">
        ↻
      </Btn>
    </div>
  );
}
