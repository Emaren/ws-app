// src/components/editor/wysiwygStyle.ts
// One source of truth used by BOTH:
// - TinyMCE (via `content_style`) where selectors hit the iframe <body>
// - Article viewer (via <WysiwygStyle/>) where selectors hit a .wysiwyg wrapper
//
// Using :where(.wysiwyg, body) keeps the rules scoped correctly in both places.

export const WYSIWYG_CSS = `
  :root { color-scheme: light dark; }

  :where(.wysiwyg, body) {
    font-family: Arial, Helvetica, sans-serif;
    line-height: 1.7;
    font-size: 1rem;
  }

  /* Headings */
  :where(.wysiwyg, body) h1,
  :where(.wysiwyg, body) h2,
  :where(.wysiwyg, body) h3,
  :where(.wysiwyg, body) h4 {
    font-weight: 700;
    line-height: 1.25;
    margin: 1.2em 0 .6em;
  }
  :where(.wysiwyg, body) h1 { font-size: 1.875rem; }
  :where(.wysiwyg, body) h2 { font-size: 1.5rem; border-bottom: 1px solid rgba(127,127,127,.25); padding-bottom: .4rem; }
  :where(.wysiwyg, body) h3 { font-size: 1.25rem; }
  :where(.wysiwyg, body) h4 { font-size: 1.1rem; }

  /* Paragraphs & emphasis */
  :where(.wysiwyg, body) p { margin: .8em 0; }
  :where(.wysiwyg, body) strong, :where(.wysiwyg, body) b { font-weight: 700; }
  :where(.wysiwyg, body) em, :where(.wysiwyg, body) i { font-style: italic; }
  :where(.wysiwyg, body) u { text-decoration: underline; }

  /* Links */
  :where(.wysiwyg, body) a {
    color: #2563eb;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* Lists — FORCE real bullets/numbers and spacing like in the editor */
  :where(.wysiwyg, body) ul,
  :where(.wysiwyg, body) ol {
    margin: .75em 0 .75em 1.25em;
    padding-left: 1.25em;
    list-style-position: outside;
  }
  :where(.wysiwyg, body) ul { list-style: disc; }
  :where(.wysiwyg, body) ol { list-style: decimal; }
  :where(.wysiwyg, body) li { margin: .25em 0; }

  /* Horizontal rule */
  :where(.wysiwyg, body) hr {
    border: 0;
    border-top: 1px solid rgba(127,127,127,.35);
    margin: 1.25em 0;
  }

  /* Blockquote */
  :where(.wysiwyg, body) blockquote {
    margin: 1em 0;
    padding: .75em 1em;
    border-left: 3px solid rgba(127,127,127,.35);
    background: rgba(127,127,127,.08);
    border-radius: .5rem;
    font-style: italic;
  }

  /* Tables — borders and cell padding that match the editor */
  :where(.wysiwyg, body) table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0 1.25em;
    font-size: .95rem;
    overflow: hidden;
    border-radius: .5rem;
    font-variant-numeric: tabular-nums;
  }
  :where(.wysiwyg, body) thead th {
    text-align: left;
    font-weight: 700;
    background: rgba(127,127,127,.12);
  }
  :where(.wysiwyg, body) th,
  :where(.wysiwyg, body) td {
    padding: .6em .75em;
    border: 1px solid rgba(127,127,127,.25);
    vertical-align: top;
    text-align: left;
  }
  :where(.wysiwyg, body) tbody tr:nth-child(odd) {
    background: rgba(127,127,127,.06);
  }

  /* Images */
  :where(.wysiwyg, body) img {
    max-width: 100%;
    height: auto;
  }

  /* Code */
  :where(.wysiwyg, body) code,
  :where(.wysiwyg, body) pre {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }
  :where(.wysiwyg, body) code {
    background: rgba(127,127,127,.16);
    padding: .15em .35em;
    border-radius: .35rem;
  }
  :where(.wysiwyg, body) pre {
    background: rgba(127,127,127,.08);
    padding: .75rem;
    border-radius: .5rem;
    overflow-x: auto;
  }

  /* Match editor anti-aliasing */
  :where(.wysiwyg, body) * {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
`;
