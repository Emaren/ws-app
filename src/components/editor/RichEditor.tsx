// src/components/editor/RichEditor.tsx
"use client";

import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
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
    min-height: 46rem;
    max-width: 80ch;
    margin: 0 auto;
    padding: 2.2rem 2rem 2.8rem;
    outline: none;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.02), transparent 20%),
      transparent;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.78;
    caret-color: color-mix(in oklab, currentColor 82%, #f59e0b);
  }

  @media (min-width: 768px) {
    .ws-rich-editor .ProseMirror {
      padding: 2.45rem 2.65rem 3rem;
    }
  }

  .ws-rich-editor .ProseMirror > :first-child {
    margin-top: 0 !important;
  }

  .ws-rich-editor .ProseMirror > :last-child {
    margin-bottom: 0 !important;
  }

  .ws-rich-editor .ProseMirror p:has(> br.ProseMirror-trailingBreak:only-child) {
    margin: .08em 0;
    min-height: .08em;
  }

  .ws-rich-editor .ProseMirror :is(ul,ol){
    margin-left: 1.55rem;
    padding-left: 1.55rem;
  }

  .ws-rich-editor .ProseMirror :is(ul,ol) :is(ul,ol){
    margin-left: 1.35rem;
    padding-left: 1.35rem;
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
    margin-top: 0;
  }
`;

const PREVIEW_BASE_CSS = WYSIWYG_CSS.replaceAll(
  ":where(.wysiwyg, body)",
  ".ws-editor-preview",
);

const PREVIEW_EXTRA_CSS = `
  .ws-editor-preview {
    min-height: 46rem;
    max-width: 80ch;
    margin: 0 auto;
    padding: 2.2rem 2rem 2.8rem;
    background:
      radial-gradient(circle at top, rgba(245,158,11,0.06), transparent 42%),
      transparent;
    white-space: pre-wrap;
    word-break: break-word;
  }

  @media (min-width: 768px) {
    .ws-editor-preview {
      padding: 2.45rem 2.65rem 3rem;
    }
  }

  .ws-editor-preview > :first-child {
    margin-top: 0 !important;
  }

  .ws-editor-preview > :last-child {
    margin-bottom: 0 !important;
  }

  .ws-rich-editor[data-editor-tone="dark"] .ws-editor-preview {
    color: #f5f5f4;
  }

  .ws-rich-editor[data-editor-tone="light"] .ws-editor-preview {
    color: #171717;
    background:
      radial-gradient(circle at top, rgba(15,23,42,0.035), transparent 40%),
      transparent;
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
type EditorViewMode = "write" | "split" | "preview";

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

type OutlineItem = {
  level: 2 | 3 | 4;
  text: string;
};

type CommandDeckEntry = {
  id: string;
  category: string;
  label: string;
  hint: string;
  keywords: string[];
  run: (editor: Editor) => void;
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

function extractOutline(html: string): OutlineItem[] {
  const sanitized = sanitize(html || "");
  const matches = Array.from(sanitized.matchAll(/<(h2|h3|h4)\b[^>]*>([\s\S]*?)<\/\1>/gi));

  return matches
    .map((match) => {
      const level = Number(match[1].replace("h", "")) as 2 | 3 | 4;
      const text = match[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!text) return null;
      return { level, text };
    })
    .filter((item): item is OutlineItem => Boolean(item));
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

function insertSectionBlock(editor: Editor) {
  editor
    .chain()
    .focus()
    .insertContent(
      "<h2>Section heading</h2><p>Lead paragraph.</p><p>Supporting paragraph.</p><p><br></p>",
    )
    .run();
}

function insertChecklistBlock(editor: Editor) {
  editor
    .chain()
    .focus()
    .insertContent(
      "<h3>Why it matters</h3><p>Set up the checklist in one sentence.</p><ul><li><p>First point</p></li><li><p>Second point</p></li><li><p>Third point</p></li></ul><p><br></p>",
    )
    .run();
}

function insertQuoteBlock(editor: Editor) {
  editor
    .chain()
    .focus()
    .insertContent("<blockquote><p>Quote.</p><p>- Attribution</p></blockquote><p><br></p>")
    .run();
}

function insertVerdictBlock(editor: Editor) {
  editor
    .chain()
    .focus()
    .insertContent(
      "<h2>Final Verdict</h2><p><strong>Lead verdict sentence.</strong></p><p>Follow with the reason it earned that verdict.</p><p><br></p>",
    )
    .run();
}

function insertTastingNotesBlock(editor: Editor) {
  editor
    .chain()
    .focus()
    .insertContent(
      "<h2>Taste Notes from a Lifelong Drinker</h2><blockquote><p>Describe the sip, texture, sweetness, and finish.</p><p>- Tony Blum, Founder, Wheat & Stone</p></blockquote><p><br></p>",
    )
    .run();
}

function insertFinderBlock(editor: Editor) {
  editor
    .chain()
    .focus()
    .insertContent(
      "<h2>Where to Find It</h2><p>List the most reliable stores, cities, and price range.</p><p><strong>Pro tip:</strong> Add one practical buying note.</p><p><br></p>",
    )
    .run();
}

function insertProsConsBlock(editor: Editor) {
  editor
    .chain()
    .focus()
    .insertContent(
      "<h2>Pros and Cons</h2><table><thead><tr><th>Pros</th><th>Cons</th></tr></thead><tbody><tr><td><ul><li><p>First strength</p></li><li><p>Second strength</p></li></ul></td><td><ul><li><p>First drawback</p></li><li><p>Second drawback</p></li></ul></td></tr></tbody></table><p><br></p>",
    )
    .run();
}

function insertFaqBlock(editor: Editor) {
  editor
    .chain()
    .focus()
    .insertContent(
      "<h2>Quick Answers</h2><h3>Is it worth the premium?</h3><p>Give the straight answer first.</p><h3>Who is it for?</h3><p>Name the exact buyer.</p><p><br></p>",
    )
    .run();
}

function insertCalloutBlock(editor: Editor) {
  editor
    .chain()
    .focus()
    .insertContent(
      "<blockquote><p><strong>Editor note:</strong> Add one sharp takeaway the reader should not miss.</p></blockquote><p><br></p>",
    )
    .run();
}

function insertImageFromUrl(editor: Editor) {
  const src = window.prompt("Image URL");
  if (!src) return;
  editor.chain().focus().setImage({ src: src.trim(), alt: "Article image" }).run();
}

function clearFormatting(editor: Editor) {
  editor.chain().focus().unsetAllMarks().clearNodes().run();
}

function buildCommandDeck(editor: Editor): CommandDeckEntry[] {
  return [
    {
      id: "section",
      category: "Story block",
      label: "Insert section",
      hint: "Add a section heading with two starter paragraphs.",
      keywords: ["section", "heading", "subsection", "paragraph"],
      run: insertSectionBlock,
    },
    {
      id: "checklist",
      category: "Story block",
      label: "Insert checklist",
      hint: "Drop in a checklist section with supporting copy.",
      keywords: ["checklist", "bullets", "pros", "list"],
      run: insertChecklistBlock,
    },
    {
      id: "verdict",
      category: "Story block",
      label: "Insert verdict",
      hint: "Create the final verdict block with a strong lead sentence.",
      keywords: ["verdict", "final", "closing", "summary"],
      run: insertVerdictBlock,
    },
    {
      id: "tasting-note",
      category: "Story block",
      label: "Insert tasting note",
      hint: "Add the founder quote / tasting note pattern.",
      keywords: ["tasting", "quote", "founder", "taste notes"],
      run: insertTastingNotesBlock,
    },
    {
      id: "finder",
      category: "Commerce",
      label: "Insert where-to-find-it",
      hint: "Stores, cities, and price guidance in one clean block.",
      keywords: ["finder", "where to find", "buy", "stores", "price"],
      run: insertFinderBlock,
    },
    {
      id: "faq",
      category: "Story block",
      label: "Insert FAQ",
      hint: "Quick-answer section for objections or common questions.",
      keywords: ["faq", "questions", "answers"],
      run: insertFaqBlock,
    },
    {
      id: "quote-card",
      category: "Structure",
      label: "Insert quote card",
      hint: "Add a clean quote with attribution.",
      keywords: ["quote", "blockquote", "testimonial"],
      run: insertQuoteBlock,
    },
    {
      id: "callout",
      category: "Structure",
      label: "Insert callout",
      hint: "Surface one editor note or key takeaway.",
      keywords: ["callout", "note", "highlight"],
      run: insertCalloutBlock,
    },
    {
      id: "comparison-table",
      category: "Tables",
      label: "Insert comparison table",
      hint: "Build a product comparison grid instantly.",
      keywords: ["table", "comparison", "grid"],
      run: insertComparisonTable,
    },
    {
      id: "pros-cons",
      category: "Tables",
      label: "Insert pros / cons",
      hint: "Two-column strengths and drawbacks layout.",
      keywords: ["pros", "cons", "table"],
      run: insertProsConsBlock,
    },
    {
      id: "divider",
      category: "Structure",
      label: "Insert divider",
      hint: "Break the rhythm with a clean section rule.",
      keywords: ["divider", "rule", "hr"],
      run: (activeEditor) => activeEditor.chain().focus().setHorizontalRule().run(),
    },
    {
      id: "spacer",
      category: "Structure",
      label: "Insert spacer",
      hint: "Add intentional breathing room without ugly double breaks.",
      keywords: ["spacer", "space", "breathing room", "line break"],
      run: insertSpacer,
    },
    {
      id: "tight-line",
      category: "Structure",
      label: "Insert tight line",
      hint: "Use a soft line break inside the same paragraph block.",
      keywords: ["tight", "soft break", "shift enter"],
      run: insertTightLine,
    },
    {
      id: "indent-list",
      category: "Lists",
      label: "Indent list item",
      hint: "Nest the current bullet or numbered line.",
      keywords: ["indent", "nest", "list"],
      run: (activeEditor) => activeEditor.chain().focus().sinkListItem("listItem").run(),
    },
    {
      id: "outdent-list",
      category: "Lists",
      label: "Outdent list item",
      hint: "Lift the current nested bullet or number back out.",
      keywords: ["outdent", "lift", "list"],
      run: (activeEditor) => activeEditor.chain().focus().liftListItem("listItem").run(),
    },
    {
      id: "image",
      category: "Media",
      label: "Insert image from URL",
      hint: "Drop a remote image into the article body.",
      keywords: ["image", "media", "photo"],
      run: insertImageFromUrl,
    },
    {
      id: "link",
      category: "Links",
      label: "Insert link",
      hint: "Wrap the current selection in a proper outbound link.",
      keywords: ["link", "url", "hyperlink"],
      run: (activeEditor) => {
        const url = window.prompt("Link URL");
        if (!url) return;
        activeEditor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url, target: "_blank", rel: "noopener noreferrer" })
          .run();
      },
    },
    {
      id: "plain",
      category: "Cleanup",
      label: "Clear formatting",
      hint: "Strip weird pasted styling and return to clean content.",
      keywords: ["plain", "cleanup", "formatting"],
      run: clearFormatting,
    },
  ];
}

export default function RichEditor({
  value,
  onChange,
  className,
  quietSet,
  theme = "auto",
}: Props) {
  const editorRef = React.useRef<Editor | null>(null);
  const commandInputRef = React.useRef<HTMLInputElement | null>(null);
  const [resolvedTone, setResolvedTone] = useState<EditorTone>(
    theme === "dark" ? "dark" : theme === "light" ? "light" : "dark",
  );
  const [viewMode, setViewMode] = useState<EditorViewMode>("write");
  const [commandDeckOpen, setCommandDeckOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

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
          event.key === "/" &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          activeEditor
        ) {
          const { empty, $from } = activeEditor.state.selection;
          const currentBlockText = $from.parent.textContent;
          if (empty && $from.parent.isTextblock && currentBlockText.trim().length === 0) {
            event.preventDefault();
            setCommandQuery("");
            setCommandDeckOpen(true);
            window.setTimeout(() => commandInputRef.current?.focus(), 0);
            return true;
          }
        }

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
  const outline = useMemo(() => extractOutline(value || ""), [value]);
  const deferredValue = useDeferredValue(value || "");
  const previewHtml = useMemo(() => sanitize(deferredValue), [deferredValue]);
  const commandDeck = useMemo(() => (editor ? buildCommandDeck(editor) : []), [editor]);
  const normalizedCommandQuery = commandQuery.trim().toLowerCase();
  const filteredCommands = useMemo(() => {
    if (!normalizedCommandQuery) return commandDeck;

    return commandDeck.filter((command) => {
      const haystack = [command.label, command.category, command.hint, ...command.keywords]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedCommandQuery);
    });
  }, [commandDeck, normalizedCommandQuery]);
  const featuredCommands = useMemo(() => commandDeck.slice(0, 6), [commandDeck]);
  const luxuryQuickCommands = useMemo(
    () =>
      commandDeck.filter((command) =>
        ["section", "checklist", "comparison-table", "tasting-note", "quote-card", "divider"].includes(
          command.id,
        ),
      ),
    [commandDeck],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandDeckOpen(true);
        window.setTimeout(() => commandInputRef.current?.focus(), 0);
        return;
      }

      if (event.key === "Escape" && document.activeElement === commandInputRef.current) {
        setCommandQuery("");
        setCommandDeckOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
  const previewTone =
    resolvedTone === "dark"
      ? "border-white/10 bg-black/[0.32]"
      : "border-black/10 bg-neutral-50/90";
  const featureTone =
    resolvedTone === "dark"
      ? "bg-white/[0.045] text-neutral-300"
      : "bg-black/[0.04] text-neutral-700";

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
              Editorial Studio
            </p>
            <h3 className="text-[1.35rem] font-semibold tracking-tight md:text-[1.55rem]">
              Luxury Article Editor
            </h3>
            <p className={cx("max-w-2xl text-[0.95rem] leading-7", helperTone)}>
              Build the story the way it will actually read live: disciplined rhythm, proper list
              depth, better tables, and fast block insertion without fighting the layout.
            </p>

            <div className="mt-4 space-y-2">
              <p className={cx("text-[10px] font-semibold uppercase tracking-[0.22em]", helperTone)}>
                Quick Insert
              </p>
              <div className="flex flex-wrap gap-2">
                {luxuryQuickCommands.map((command) => (
                  <QuickInsertPill
                    key={command.id}
                    tone={resolvedTone}
                    onClick={() => command.run(editor)}
                  >
                    {command.label}
                  </QuickInsertPill>
                ))}
              </div>
              <p className={cx("text-[0.8rem] leading-6", helperTone)}>
                Slash opens the command deck, Tab nests bullets, Shift + Tab lifts them back out,
                and the preview stays aligned with the live article surface.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[21rem] md:items-end">
            <div className="flex flex-wrap items-start justify-between gap-3 md:flex-col md:items-end">
              <div className="inline-flex rounded-full border border-current/10 p-1">
                <ModeBtn active={viewMode === "write"} onClick={() => setViewMode("write")}>
                  Write
                </ModeBtn>
                <ModeBtn active={viewMode === "split"} onClick={() => setViewMode("split")}>
                  Split
                </ModeBtn>
                <ModeBtn active={viewMode === "preview"} onClick={() => setViewMode("preview")}>
                  Preview
                </ModeBtn>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatPill tone={statTone} label="Words" value={summary.words.toLocaleString()} />
                <StatPill tone={statTone} label="Characters" value={summary.characters.toLocaleString()} />
                <StatPill tone={statTone} label="Blocks" value={summary.blocks.toString()} />
                <button
                  type="button"
                  onClick={() => setCommandDeckOpen((current) => !current)}
                  className={cx(
                    "rounded-full border px-3 py-2 text-left transition cursor-pointer",
                    statTone,
                    resolvedTone === "dark"
                      ? "hover:border-amber-300/35 hover:bg-amber-200/10"
                      : "hover:border-amber-300/35 hover:bg-amber-200/10",
                  )}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">Command Deck</div>
                  <div className="text-sm font-semibold tracking-tight">
                    {commandDeckOpen ? "Hide" : "Open"} / Cmd-K
                  </div>
                </button>
              </div>
            </div>

            {outline.length ? (
              <div
                className={cx(
                  "w-full rounded-[1.25rem] border px-4 py-3 text-left md:max-w-[24rem]",
                  resolvedTone === "dark"
                    ? "border-white/10 bg-white/[0.035]"
                    : "border-black/10 bg-black/[0.03]",
                )}
              >
                <p className={cx("text-[10px] font-semibold uppercase tracking-[0.22em]", helperTone)}>
                  Structure Map
                </p>
                <div className="mt-2 space-y-1.5">
                  {outline.slice(0, 8).map((item, index) => (
                    <div
                      key={`${item.level}-${item.text}-${index}`}
                      className={cx(
                        "truncate text-[0.86rem] leading-6",
                        item.level === 2
                          ? "font-semibold"
                          : item.level === 3
                            ? "pl-3 opacity-90"
                            : "pl-6 opacity-75",
                      )}
                    >
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <CommandDeck
        editor={editor}
        tone={resolvedTone}
        open={commandDeckOpen}
        onToggle={() => setCommandDeckOpen((current) => !current)}
        query={commandQuery}
        onQueryChange={setCommandQuery}
        inputRef={commandInputRef}
        featuredCommands={featuredCommands}
        filteredCommands={filteredCommands}
      />

      <Toolbar editor={editor} tone={resolvedTone} />

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
          <span>Slash = Command Deck</span>
          <span>Spacer button = clean breathing room</span>
          <span>Write mode opens first for breathing room</span>
        </div>

        <div
          className={cx(
            viewMode === "split" ? "grid xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]" : "",
          )}
        >
          {viewMode !== "preview" ? (
            <div
              className={cx(
                "min-w-0",
                viewMode === "split" ? "border-b xl:border-b-0 xl:border-r" : "",
                dividerTone,
              )}
            >
              <EditorContent editor={editor} />
            </div>
          ) : null}

          {viewMode !== "write" ? (
            <PreviewPanel
              tone={resolvedTone}
              dividerTone={dividerTone}
              surfaceTone={previewTone}
              html={previewHtml}
            />
          ) : null}
        </div>
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

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.12em] transition cursor-pointer",
        active
          ? "bg-amber-200/20 text-amber-700 dark:bg-amber-200/16 dark:text-amber-100"
          : "text-neutral-500 hover:bg-black/5 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-neutral-100",
      )}
    >
      {children}
    </button>
  );
}

function PreviewPanel({
  tone,
  dividerTone,
  surfaceTone,
  html,
}: {
  tone: EditorTone;
  dividerTone: string;
  surfaceTone: string;
  html: string;
}) {
  return (
    <aside className={cx("min-w-0", tone === "dark" ? "bg-black/[0.14]" : "bg-black/[0.015]")}>
      <style
        id="wysiwyg-shared-css-editor-preview"
        dangerouslySetInnerHTML={{ __html: `${PREVIEW_BASE_CSS}\n${PREVIEW_EXTRA_CSS}` }}
      />

      <div
        className={cx(
          "flex items-center justify-between border-b px-4 py-3 md:px-5",
          dividerTone,
          tone === "dark" ? "text-neutral-300" : "text-neutral-600",
        )}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] opacity-70">Live Preview</p>
          <p className="mt-1 text-sm">Preview the article rhythm without leaving the editor.</p>
        </div>
      </div>

      <div className={cx("h-full min-w-0", surfaceTone)}>
        <div className="ws-editor-preview" dangerouslySetInnerHTML={{ __html: html || "<p></p>" }} />
      </div>
    </aside>
  );
}

function ToolbarGroup({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone: EditorTone;
}) {
  return (
    <div
      className={cx(
        "flex min-w-[12rem] flex-col gap-2.5 rounded-[1.35rem] border px-3.5 py-3",
        tone === "dark" ? "border-white/10 bg-white/[0.04]" : "border-black/10 bg-black/[0.03]",
      )}
    >
      <div
        className={cx(
          "text-[10px] font-semibold uppercase tracking-[0.22em]",
          tone === "dark" ? "text-neutral-400" : "text-neutral-500",
        )}
      >
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
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
        "rounded-[1rem] border px-3.5 py-2.25 text-[13px] font-medium tracking-[0.01em] transition cursor-pointer",
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
        "sticky top-0 z-20 border-b px-4 py-3 md:px-5 md:py-4 backdrop-blur-md",
        dividerTone,
        tone === "dark"
          ? "bg-neutral-950/88 shadow-[0_18px_50px_rgba(0,0,0,0.25)]"
          : "bg-white/88 shadow-[0_18px_45px_rgba(15,23,42,0.08)]",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className={cx("text-[10px] font-semibold uppercase tracking-[0.24em]", tone === "dark" ? "text-neutral-400" : "text-neutral-500")}>
            Control Deck
          </p>
          <p className={cx("mt-1 text-xs", tone === "dark" ? "text-neutral-400/85" : "text-neutral-600")}>
            Formatting, structure, tables, links, and cleanup live here in one readable control rail.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto md:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2.5 md:min-w-0 md:flex-wrap">
          <ToolbarGroup tone={tone} label="Type">
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

          <ToolbarGroup tone={tone} label="Lists">
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

          <ToolbarGroup tone={tone} label="Structure">
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
            <Btn onClick={() => insertImageFromUrl(editor)} title="Insert image from URL">
              Image
            </Btn>
          </ToolbarGroup>

          <ToolbarGroup tone={tone} label="Tables">
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

          <ToolbarGroup tone={tone} label="Links">
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

          <ToolbarGroup tone={tone} label="History">
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
      </div>
    </div>
  );
}

function CommandDeck({
  editor,
  tone,
  open,
  onToggle,
  query,
  onQueryChange,
  inputRef,
  featuredCommands,
  filteredCommands,
}: {
  editor: Editor;
  tone: EditorTone;
  open: boolean;
  onToggle: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  featuredCommands: CommandDeckEntry[];
  filteredCommands: CommandDeckEntry[];
}) {
  const railTone =
    tone === "dark"
      ? "border-b border-white/10 bg-white/[0.025] text-neutral-300"
      : "border-b border-black/10 bg-black/[0.02] text-neutral-600";

  return (
    <div className={cx("px-4 py-3 md:px-5", railTone)}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] opacity-70">
                Command Deck
              </span>
              <span className="text-xs opacity-70">
              Search blocks, formatting moves, tables, and cleanup commands fast.
              </span>
            </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="rich-editor-command-search" className="sr-only">
              Search editor commands
            </label>
            <input
              ref={inputRef}
              id="rich-editor-command-search"
              type="search"
              value={query}
              onChange={(event) => {
                onQueryChange(event.target.value);
                if (!open) onToggle();
              }}
              placeholder="Search commands, e.g. checklist, table, indent, quote..."
              className={cx(
                "min-w-[17rem] rounded-[1rem] border px-3.5 py-2.5 text-sm outline-none transition",
                tone === "dark"
                  ? "border-white/10 bg-black/35 text-neutral-100 placeholder:text-neutral-500 focus:border-amber-300/40 focus:bg-black/45"
                  : "border-black/10 bg-white text-neutral-900 placeholder:text-neutral-500 focus:border-amber-300/40 focus:bg-white",
              )}
            />
            <button
              type="button"
              onClick={onToggle}
              className={cx(
                "rounded-[1rem] border px-3.5 py-2.5 text-sm font-semibold transition cursor-pointer",
                tone === "dark"
                  ? "border-white/10 bg-white/[0.04] hover:border-amber-300/35 hover:bg-amber-200/10"
                  : "border-black/10 bg-white hover:border-amber-300/35 hover:bg-amber-200/10",
              )}
            >
              {open ? "Collapse deck" : "Open deck"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {featuredCommands.map((command) => (
            <CommandDeckChip
              key={command.id}
              tone={tone}
              onClick={() => command.run(editor)}
            >
              {command.label}
            </CommandDeckChip>
          ))}
        </div>

        {open || query.trim() ? (
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCommands.length ? (
              filteredCommands.map((command) => (
                <CommandDeckCard
                  key={command.id}
                  tone={tone}
                  command={command}
                  onClick={() => {
                    command.run(editor);
                    onQueryChange("");
                  }}
                />
              ))
            ) : (
              <div
                className={cx(
                  "rounded-[1.2rem] border px-4 py-4 text-sm md:col-span-2 xl:col-span-3",
                  tone === "dark" ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-black/[0.025]",
                )}
              >
                No command matches that search yet.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CommandDeckChip({
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

function QuickInsertPill({
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
        "rounded-full border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition cursor-pointer",
        tone === "dark"
          ? "border-white/10 bg-white/[0.035] text-neutral-200 hover:border-amber-300/30 hover:bg-amber-200/10"
          : "border-black/10 bg-white text-neutral-700 hover:border-amber-300/35 hover:bg-amber-200/10",
      )}
    >
      {children}
    </button>
  );
}

function CommandDeckCard({
  tone,
  command,
  onClick,
}: {
  tone: EditorTone;
  command: CommandDeckEntry;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-[1.25rem] border px-4 py-3 text-left transition cursor-pointer",
        tone === "dark"
          ? "border-white/10 bg-white/[0.03] hover:border-amber-300/35 hover:bg-amber-200/10"
          : "border-black/10 bg-white hover:border-amber-300/35 hover:bg-amber-200/10",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] opacity-65">
        {command.category}
      </div>
      <div className="mt-1 text-[0.98rem] font-semibold tracking-tight">{command.label}</div>
      <p className="mt-1.5 text-[0.84rem] leading-6 opacity-78">{command.hint}</p>
    </button>
  );
}
