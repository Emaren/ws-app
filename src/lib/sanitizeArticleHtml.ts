import sanitizeHtml, { type IOptions } from "sanitize-html";

const SANITIZE_OPTIONS: IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "blockquote",
    "pre",
    "code",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "hr",
    "span",
    "div",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "title", "aria-label"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    th: ["colspan", "rowspan", "scope", "align"],
    td: ["colspan", "rowspan", "scope", "align"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  enforceHtmlBoundary: true,
  disallowedTagsMode: "discard",
};

function addSafeRelToTargetBlankLinks(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (fullMatch, attrs) => {
    const attributes = typeof attrs === "string" ? attrs : "";
    const hasTargetBlank = /\btarget\s*=\s*(['"]?)_blank\1/i.test(attributes);
    if (!hasTargetBlank) {
      return fullMatch;
    }

    const relMatch = attributes.match(/\brel\s*=\s*(['"])([^'"]*)\1/i);
    if (!relMatch) {
      return `<a${attributes} rel="noopener noreferrer nofollow">`;
    }

    const existingRel = relMatch[2]
      .split(/\s+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const relSet = new Set(existingRel);
    relSet.add("noopener");
    relSet.add("noreferrer");
    relSet.add("nofollow");
    const normalizedRel = Array.from(relSet).join(" ");

    return fullMatch.replace(relMatch[0], `rel="${normalizedRel}"`);
  });
}

export function sanitizeArticleHtml(html: string | null | undefined): string {
  if (!html || !html.trim()) {
    return "";
  }

  const clean = sanitizeHtml(html, SANITIZE_OPTIONS);
  return addSafeRelToTargetBlankLinks(clean);
}
