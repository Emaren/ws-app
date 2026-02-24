// src/components/article/WysiwygStyle.tsx
import { WYSIWYG_CSS } from "@/components/editor/wysiwygStyle";

const EXTRA_CSS = `
/* ------------------------------------------------------------ */
/* Beaverlodge + checklist grid (stable, balanced sizing)       */
/* ------------------------------------------------------------ */

.wysiwyg .ws-checkgrid{
  display: grid;
  grid-template-columns: 300px 1fr;   /* was 320px */
  column-gap: 1.25rem;
  align-items: start;
  margin: .65rem 0 1rem;
}

.wysiwyg .ws-check-ad{
  margin-top: -6px;
  margin-left: -6px;
}

/* FloatAd ships with inline float + w-full; neutralize inside grid */
.wysiwyg .ws-check-ad .floatad{
  float: none !important;
  width: 300px !important;           /* was 320px */
  max-width: 300px !important;
  display: inline-block !important;
  margin: 0 !important;
  padding: 0 !important;
}

.wysiwyg .ws-check-ad .floatad img{
  display: block !important;
  width: 100% !important;
  height: auto !important;
  max-width: none !important;
  margin: 0 !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.wysiwyg .ws-checklist-wrap{ min-width: 0; }
.wysiwyg .ws-checklist-wrap ul.ws-checklist{
  margin: 0;
  padding-left: 1.15rem;
  list-style: disc;
  list-style-position: outside;
  font-size: 1.02rem;
  line-height: 1.38;
}
.wysiwyg .ws-checklist-wrap ul.ws-checklist > li{ margin: .34rem 0; }
.wysiwyg .ws-checklist-wrap ul.ws-checklist li > p{ margin: 0; display: inline; }
.wysiwyg .ws-checklist-wrap ul.ws-checklist strong{ font-weight: 700; }

/* Mobile: stack cleanly */
@media (max-width: 680px){
  .wysiwyg .ws-checkgrid{
    grid-template-columns: 1fr;
    row-gap: .75rem;
  }
  .wysiwyg .ws-check-ad{
    margin: 0;
    justify-self: center;
  }
  .wysiwyg .ws-check-ad .floatad{
    width: min(300px, 100%) !important;
    max-width: 100% !important;
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