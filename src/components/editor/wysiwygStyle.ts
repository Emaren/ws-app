// src/components/editor/wysiwygStyle.ts
export const WYSIWYG_CSS = `
  :root{ color-scheme: light dark; }
  body { font-family: Arial, Helvetica, sans-serif; line-height: 1.7; padding: 1rem; }
  h1,h2,h3,h4 { font-weight:700; line-height:1.25; margin:1.25em 0 .6em; }
  h1{font-size:2rem}
  h2{font-size:1.5rem; border-bottom:1px solid rgba(127,127,127,.25); padding-bottom:.4rem;}
  h3{font-size:1.25rem}
  h4{font-size:1.1rem}
  p{margin:.75em 0}
  a{color:#2563eb; text-decoration:underline; text-underline-offset:3px}
  ul,ol{margin:.75em 0 .75em 1.25em; padding-left:1.25em}
  li{margin:.25em 0}
  blockquote{margin:1em 0; padding:.75em 1em; border-left:3px solid rgba(127,127,127,.35); background:rgba(127,127,127,.08); border-radius:.5rem}
  table{width:100%; border-collapse:collapse; margin:1em 0 1.25em; font-size:.95rem; overflow:hidden; border-radius:.5rem}
  thead th{ text-align:left; font-weight:700; background:rgba(127,127,127,.12) }
  th,td{ padding:.6em .75em; border:1px solid rgba(127,127,127,.25) }
  tbody tr:nth-child(odd){ background:rgba(127,127,127,.06) }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono','Courier New', monospace; background: rgba(127,127,127,.16); padding:.15em .35em; border-radius:.35rem; }

  /* Keep viewer parity with the editor’s antialiasing */
  * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
`;
