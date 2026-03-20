// src/components/editor/RichEditor.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { readThemeFromDocument, type ThemeMode } from "@/lib/theme";
import { WYSIWYG_CSS } from "./wysiwygStyle";

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
  "s",
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

const LIGHT_THEMES = new Set<ThemeMode>(["white", "sepia"]);

const EDITOR_BASE_CSS = WYSIWYG_CSS.replaceAll(
  ":where(.wysiwyg, body)",
  ".ws-rich-editor .ProseMirror",
);

const EDITOR_EXTRA_CSS = `
  .ws-rich-editor .ProseMirror {
    min-height: 44rem;
    padding: 1.7rem 1.7rem 2.1rem;
    outline: none;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.02), transparent 20%),
      transparent;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.78;
  }

  @media (min-width: 768px) {
    .ws-rich-editor .ProseMirror {
      padding: 1.95rem 2.15rem 2.35rem;
    }
  }

  .ws-rich-editor .ProseMirror > :first-child {
    margin-top: 0 !important;
  }

  .ws-rich-editor .ProseMirror > :last-child {
    margin-bottom: 0 !important;
  }

  .ws-rich-editor .ProseMirror p:has(> br.ProseMirror-trailingBreak:only-child) {
    margin: .16em 0;
    min-height: .16em;
  }

  .ws-rich-editor .ProseMirror table {
    table-layout: fixed;
  }

  .ws-rich-editor .ProseMirror a {
    cursor: pointer;
  }

  .ws-rich-editor[data-editor-tone="dark"] .ProseMirror {
    color: #f5f5f4;
  }

  .ws-rich-editor[data-editor-tone="light"] .ProseMirror {
    color: #171717;
    background:
      linear-gradient(180deg, rgba(0,0,0,0.01), transparent 18%),
      transparent;
  }

  .ws-rich-editor[data-editor-tone="dark"] .ProseMirror blockquote {
    background: rgba(245, 245, 244, 0.06);
  }

  .ws-rich-editor[data-editor-tone="light"] .ProseMirror blockquote {
    background: rgba(23, 23, 23, 0.045);
  }

  .ws-rich-editor .ProseMirror blockquote p + p {
    margin-top: 0.35em;
  }
`;

function sanitize(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "style"],
    KEEP_CONTENT: true,
  });
}

type Theme = "auto" | "light" | "dark";
type EditorTone = "light" | "dark";
type BlockValue = "paragraph" | "h1" | "h2" | "h3" | "h4" | "blockquote";

type Props = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  quietSet?: boolean;
  theme?: Theme;
};

type DocumentSummary = {
  words: number;
  characters: number;
  blocks: number;
};

function resolveAutoTone(): EditorTone {
  const theme = readThemeFromDocument();
  if (theme) {
    return LIGHT_THEMES.has(theme) ? "light" : "dark";
  }

  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

function currentBlock(editor: Editor): BlockValue {
  if (editor.isActive("blockquote")) return "blockquote";
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("heading", { level: 4 })) return "h4";
  return "paragraph";
}

function applyBlock(editor: Editor, value: BlockValue) {
  const chain = editor.chain().focus();

  switch (value) {
    case "h1":
      chain.setHeading({ level: 1 }).run();
      return;
    case "h2":
      chain.setHeading({ level: 2 }).run();
      return;
    case "h3":
      chain.setHeading({ level: 3 }).run();
      return;
    case "h4":
      chain.setHeading({ level: 4 }).run();
      return;
    case "blockquote":
      chain.toggleBlockquote().run();
      return;
    default:
      chain.setParagraph().run();
  }
}

function summarizeDocument(html: string): DocumentSummary {
  const sanitized = sanitize(html || "");
  const text = sanitized
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(/\s+/).length : 0;
  const characters = text.length;
  const blocks = Math.max(
    1,
    (sanitized.match(/<(p|h1|h2|h3|h4|li|blockquote|table)\b/gi) || []).length,
  );
  return { words, characters, blocks };
}

function insertSpacer(editor: Editor) {
  editor.chain().focus().insertContent("<p><br></p>").run();
}

function insertTightLine(editor: Editor) {
  editor.chain().focus().setHardBreak().run();
}

function insertComparisonTable(editor: Editor) {
  editor.chain().focus().insertTable({ rows: 4, cols: 3, withHeaderRow: true }).run();
}

function clearFormatting(editor: Editor) {
  editor.chain().focus().unsetAllMarks().clearNodes().run();
}

export default function RichEditor({
  value,
  onChange,
  className,
  quietSet,
  theme = "auto",
}: Props) {
  const editorRef = React.useRef<Editor | null>(null);
  const [resolvedTone, setResolvedTone] = useState<EditorTone>(
    theme === "dark" ? "dark" : theme === "light" ? "light" : "dark",
  );

  useEffect(() => {
    if (theme === "dark" || theme === "light") {
      setResolvedTone(theme);
      return;
    }

    const syncTone = () => setResolvedTone(resolveAutoTone());
    syncTone();

    const html = document.documentElement;
    const observer = new MutationObserver(syncTone);
    observer.observe(html, { attributes: true, attributeFilter: ["class", "data-theme"] });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", syncTone);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", syncTone);
    };
  }, [theme]);

  const editor: Editor | null = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
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
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor }) => {
      onChange(sanitize(editor.getHTML()));
    },
    editorProps: {
      attributes: {
        class: "ProseMirror",
      },
      handlePaste: (_view, event) => {
        const html = event.clipboardData?.getData("text/html");
        if (html && html.trim()) {
          event.preventDefault();
          editorRef.current?.commands.insertContent(sanitize(html));
          return true;
        }
        return false;
      },
      handleKeyDown: (_view, event): boolean => {
        const activeEditor = editorRef.current;
        if (
          event.key === "Tab" &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          activeEditor?.isActive("listItem")
        ) {
          event.preventDefault();

          if (event.shiftKey) {
            return activeEditor.chain().focus().liftListItem("listItem").run();
          }

          return activeEditor.chain().focus().sinkListItem("listItem").run();
        }

        return false;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
    return () => {
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const current = sanitize(editor.getHTML());
    const incoming = sanitize(value || "");
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: !(quietSet ?? true) });
    }
  }, [value, editor, quietSet]);

  const summary = useMemo(() => summarizeDocument(value || ""), [value]);

  if (!editor) return null;

  const shellTone =
    resolvedTone === "dark"
      ? "border-white/10 bg-neutral-950 text-neutral-100 shadow-[0_32px_80px_rgba(0,0,0,0.38)]"
      : "border-black/10 bg-white text-neutral-900 shadow-[0_30px_78px_rgba(15,23,42,0.1)]";
  const dividerTone = resolvedTone === "dark" ? "border-white/10" : "border-black/10";
  const helperTone = resolvedTone === "dark" ? "text-neutral-400" : "text-neutral-500";
  const statTone =
    resolvedTone === "dark"
      ? "border-white/10 bg-white/5 text-neutral-200"
      : "border-black/10 bg-black/[0.03] text-neutral-700";

  return (
    <div
      className={cx("ws-rich-editor overflow-hidden rounded-[1.95rem] border", shellTone, className)}
      data-editor-tone={resolvedTone}
    >
      <style
        id="wysiwyg-shared-css-editor"
        dangerouslySetInnerHTML={{ __html: `${EDITOR_BASE_CSS}\n${EDITOR_EXTRA_CSS}` }}
      />

      <div
        className={cx(
          "border-b px-5 py-5 md:px-6 md:py-6",
          dividerTone,
          resolvedTone === "dark"
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))]"
            : "bg-[linear-gradient(180deg,rgba(15,23,42,0.035),rgba(15,23,42,0.008))]",
        )}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className={cx("text-[11px] font-semibold uppercase tracking-[0.26em]", helperTone)}>
              Publishing Studio
            </p>
            <h3 className="text-[1.35rem] font-semibold tracking-tight md:text-[1.55rem]">
              Premium Article Editor
            </h3>
            <p className={cx("max-w-2xl text-[0.95rem] leading-7", helperTone)}>
              Write like a magazine, format like a newsroom, and keep the structure clean enough
              that the live article matches what you’re seeing here.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill tone={statTone} label="Words" value={summary.words.toLocaleString()} />
            <StatPill tone={statTone} label="Characters" value={summary.characters.toLocaleString()} />
            <StatPill tone={statTone} label="Blocks" value={summary.blocks.toString()} />
          </div>
        </div>
      </div>

      <Toolbar editor={editor} tone={resolvedTone} />
      <QuickInsertRail editor={editor} tone={resolvedTone} />

      <div className={cx("border-t", dividerTone)}>
        <div
          className={cx(
            "flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em]",
            dividerTone,
            helperTone,
          )}
        >
          <span>Paragraph = Enter</span>
          <span>Tight line = Shift + Enter</span>
          <span>List depth = Tab / Shift + Tab</span>
          <span>Spacer button = clean breathing room</span>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={cx("rounded-full border px-3 py-2 text-right", tone)}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">{label}</div>
      <div className="text-sm font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function ToolbarGroup({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: EditorTone;
}) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-2 rounded-[1.2rem] border px-3 py-3",
        tone === "dark" ? "border-white/10 bg-white/[0.04]" : "border-black/10 bg-black/[0.03]",
      )}
    >
      {children}
    </div>
  );
}

function Btn({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        "rounded-[1rem] border px-3.75 py-2.5 text-sm font-medium transition cursor-pointer",
        disabled
          ? "cursor-not-allowed opacity-40"
          : active
            ? "border-amber-300/50 bg-amber-200/20 text-amber-700 dark:text-amber-100"
            : "border-transparent hover:border-black/10 hover:bg-black/5 dark:hover:border-white/10 dark:hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({
  editor,
  tone,
}: {
  editor: Editor;
  tone: EditorTone;
}) {
  const dividerTone = tone === "dark" ? "border-white/10 bg-neutral-950/95" : "border-black/10 bg-neutral-50";
  const selectTone =
    tone === "dark"
      ? "border-white/10 bg-black/30 text-neutral-100"
      : "border-black/10 bg-white text-neutral-900";

  const canIndent = editor.can().chain().focus().sinkListItem("listItem").run();
  const canOutdent = editor.can().chain().focus().liftListItem("listItem").run();
  const canAddRow = editor.can().chain().focus().addRowAfter().run();
  const canAddColumn = editor.can().chain().focus().addColumnAfter().run();
  const canDeleteTable = editor.can().chain().focus().deleteTable().run();

  return (
    <div
      className={cx(
        "sticky top-0 z-20 flex flex-wrap gap-2.5 border-b px-4 py-3 md:px-5 md:py-4 backdrop-blur-md",
        dividerTone,
        tone === "dark" ? "bg-neutral-950/88" : "bg-white/88",
      )}
    >
      <ToolbarGroup tone={tone}>
        <label htmlFor="rich-editor-block" className="sr-only">
          Text style
        </label>
        <select
          id="rich-editor-block"
          className={cx(
            "min-w-[148px] rounded-xl border px-3 py-2 text-sm font-medium outline-none transition cursor-pointer",
            selectTone,
          )}
          value={currentBlock(editor)}
          onChange={(event) => applyBlock(editor, event.target.value as BlockValue)}
        >
          <option value="paragraph">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="blockquote">Quote</option>
        </select>

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
        <Btn
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          S
        </Btn>
      </ToolbarGroup>

      <ToolbarGroup tone={tone}>
        <Btn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bulleted list"
        >
          Bullets
        </Btn>
        <Btn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          Numbers
        </Btn>
        <Btn
          disabled={!canIndent}
          onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
          title="Indent list item"
        >
          Indent
        </Btn>
        <Btn
          disabled={!canOutdent}
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          title="Outdent list item"
        >
          Outdent
        </Btn>
      </ToolbarGroup>

      <ToolbarGroup tone={tone}>
        <Btn onClick={() => insertTightLine(editor)} title="Insert tight line break">
          Tight line
        </Btn>
        <Btn onClick={() => insertSpacer(editor)} title="Insert spacer paragraph">
          Spacer
        </Btn>
        <Btn onClick={() => clearFormatting(editor)} title="Clear formatting">
          Plain
        </Btn>
        <Btn
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          Quote
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          Divider
        </Btn>
      </ToolbarGroup>

      <ToolbarGroup tone={tone}>
        <Btn
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="Insert table"
        >
          Table
        </Btn>
        <Btn disabled={!canAddRow} onClick={() => editor.chain().focus().addRowAfter().run()} title="Add table row">
          Row +
        </Btn>
        <Btn disabled={!canAddColumn} onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add table column">
          Col +
        </Btn>
        <Btn disabled={!canDeleteTable} onClick={() => editor.chain().focus().deleteTable().run()} title="Remove table">
          Table -
        </Btn>
      </ToolbarGroup>

      <ToolbarGroup tone={tone}>
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
      </ToolbarGroup>

      <ToolbarGroup tone={tone}>
        <Btn
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          Undo
        </Btn>
        <Btn
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          Redo
        </Btn>
      </ToolbarGroup>
    </div>
  );
}

function QuickInsertRail({
  editor,
  tone,
}: {
  editor: Editor;
  tone: EditorTone;
}) {
  const railTone =
    tone === "dark"
      ? "border-b border-white/10 bg-white/[0.025] text-neutral-300"
      : "border-b border-black/10 bg-black/[0.02] text-neutral-600";

  return (
    <div className={cx("px-4 py-3 md:px-5", railTone)}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] opacity-70">
            Quick Insert
          </span>
          <span className="text-xs opacity-70">
            Build sections, checklists, and comparison blocks without fighting the markup.
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <QuickInsertBtn tone={tone} onClick={() => applyBlock(editor, "h2")}>Section</QuickInsertBtn>
          <QuickInsertBtn tone={tone} onClick={() => applyBlock(editor, "h3")}>Subhead</QuickInsertBtn>
          <QuickInsertBtn tone={tone} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            Checklist
          </QuickInsertBtn>
          <QuickInsertBtn tone={tone} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            Steps
          </QuickInsertBtn>
          <QuickInsertBtn tone={tone} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            Quote card
          </QuickInsertBtn>
          <QuickInsertBtn tone={tone} onClick={() => insertComparisonTable(editor)}>Comparison table</QuickInsertBtn>
          <QuickInsertBtn tone={tone} onClick={() => insertSpacer(editor)}>Spacer</QuickInsertBtn>
        </div>
      </div>
    </div>
  );
}

function QuickInsertBtn({
  tone,
  children,
  onClick,
}: {
  tone: EditorTone;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.04em] transition",
        tone === "dark"
          ? "border-white/10 bg-white/[0.02] hover:border-amber-300/35 hover:bg-amber-200/12"
          : "border-black/10 bg-white hover:border-amber-300/45 hover:bg-amber-200/12",
      )}
    >
      {children}
    </button>
  );
}
