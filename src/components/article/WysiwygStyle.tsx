// src/components/article/WysiwygStyle.tsx
import { WYSIWYG_CSS } from "@/components/editor/wysiwygStyle";

const EXTRA_CSS = `
/* Base rhythm */
.wysiwyg{ line-height:1.7; color:inherit; }
.wysiwyg p{ margin-block:0 1rem; }
.wysiwyg p:empty,
.wysiwyg p:has(> br:only-child){ margin-block:.16rem; min-height:.16rem; }

/* Headings */
.wysiwyg :is(h2,h3,h4){
  margin:2rem 0 .75rem; line-height:1.25; letter-spacing:-0.01em; font-weight:700;
}
.wysiwyg h2{ font-size:clamp(1.375rem,2.2vw,1.75rem); }
.wysiwyg h3{ font-size:clamp(1.125rem,1.8vw,1.375rem); }
.wysiwyg h4{ font-size:clamp(1rem,1.6vw,1.125rem); }

/* Lists */
.wysiwyg :is(ul,ol){ margin:0 0 1rem 1.35rem; padding-left:1.35rem; }
.wysiwyg li{ margin:.25rem 0; }
.wysiwyg li > p{ margin:0; }
.wysiwyg li > :is(ul,ol){ margin-top:.45rem; margin-bottom:.45rem; }
.wysiwyg :is(ul,ol) :is(ul,ol){ margin-left:1rem; padding-left:1rem; }

/* Links */
.wysiwyg a{ text-decoration:underline; text-underline-offset:2px; }

/* Blockquote cleanup */
.wysiwyg blockquote p:empty,
.wysiwyg blockquote p:has(> br:only-child){ display:none; margin:0; min-height:0; }
.wysiwyg blockquote p + p{ margin-top:.35em; }
.wysiwyg blockquote > :last-child{ margin-bottom:0 !important; }

/* Images */
.wysiwyg :is(img,a>img,figure>img){
  display:block; max-width:100%; height:auto; border-radius:.75rem;
}

/* Tables */
.wysiwyg table{
  width:100%; border-collapse:collapse; margin:1rem 0 1.25rem;
  font-size:.96rem; border-radius:.6rem; overflow:hidden;
}
.wysiwyg :is(th,td){
  border:1px solid color-mix(in oklab,currentColor 22%,transparent);
  padding:.5rem .75rem; text-align:left; vertical-align:top;
}
.wysiwyg thead th{ background:color-mix(in oklab,currentColor 8%,transparent); font-weight:600; }
.wysiwyg tbody tr:nth-child(odd){ background:color-mix(in oklab,currentColor 6%,transparent); }

/* ------------------------------------------------------------ */
/* Beaverlodge + checklist grid (stable, balanced)               */
/* ------------------------------------------------------------ */
.wysiwyg .ws-checkgrid{
  display:grid;
  grid-template-columns: minmax(240px, 315px) 1fr;
  column-gap: 1.25rem;
  align-items:start;
  margin: .65rem 0 1rem;
}

.wysiwyg .ws-check-ad{
  margin-top:-10px;
  margin-left:-10px;
}

.wysiwyg .ws-check-ad .floatad{
  float:none !important;
  width:300px !important;
  max-width:300px !important;
  display:inline-block !important;
  margin:0 !important;
  padding:0 !important;
}

.wysiwyg .ws-check-ad .floatad img{
  width:100% !important;
  height:auto !important;
  max-width:none !important;
  margin:0 !important;
}

/* Checklist */
.wysiwyg .ws-checklist-wrap{ min-width:0; }
.wysiwyg .ws-checklist-wrap ul.ws-checklist{
  margin: 0;
  padding-left: 1.15rem;
  list-style: disc;
  list-style-position: outside;
  font-size: 1.02rem;
  line-height: 1.38;
}
.wysiwyg .ws-checklist-wrap ul.ws-checklist > li{ margin: .34rem 0; }
.wysiwyg .ws-checklist-wrap ul.ws-checklist li > p{ margin:0; display:inline; }
.wysiwyg .ws-checklist-wrap ul.ws-checklist strong{ font-weight:700; }

/* Mobile */
@media (max-width: 680px){
  .wysiwyg .ws-checkgrid{
    grid-template-columns: 1fr;
    row-gap: .75rem;
  }
  .wysiwyg .ws-check-ad{
    margin:0;
    justify-self:center;
  }
  .wysiwyg .ws-check-ad .floatad{
    width:min(300px, 100%) !important;
    max-width:100% !important;
  }
}
`;

// Viewer-only: clamp editor CSS to `.wysiwyg`
const VIEWER_BASE_CSS = WYSIWYG_CSS.replaceAll(":where(.wysiwyg, body)", ".wysiwyg");

export default function WysiwygStyle() {
  return (
    <style
      id="wysiwyg-shared-css-article"
      dangerouslySetInnerHTML={{ __html: `${VIEWER_BASE_CSS}\n${EXTRA_CSS}` }}
    />
  );
}
