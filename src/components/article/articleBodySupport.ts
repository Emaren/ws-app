function decodeCommonHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&mdash;/gi, "-");
}

function stripTags(html: string): string {
  return html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ");
}

function normalizeComparableText(text: string): string {
  return decodeCommonHtmlEntities(stripTags(text))
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[-:;,!.?()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isExcerptLabel(text: string): boolean {
  return text.replace(/:\s*$/, "").trim() === "excerpt";
}

function isDuplicateExcerptText(candidate: string, excerpt: string): boolean {
  if (candidate === excerpt) {
    return true;
  }

  const sharedPrefix =
    candidate.startsWith(excerpt) || excerpt.startsWith(candidate);
  return sharedPrefix && Math.abs(candidate.length - excerpt.length) <= 24;
}

export function stripLeadingDuplicateExcerptBlock(
  html: string,
  excerpt: string | null | undefined,
): string {
  const normalizedExcerpt = normalizeComparableText(excerpt ?? "");
  if (!normalizedExcerpt) {
    return html;
  }

  const combinedParagraphMatch = html.match(
    /^\s*(?:<div\b[^>]*>\s*)?<p\b[^>]*>\s*(?:<(?:strong|b)\b[^>]*>\s*)?excerpt\s*(?:<\/(?:strong|b)>\s*)?:?\s*(?:<br\s*\/?>\s*)?([\s\S]*?)<\/p>(\s*<hr\b[^>]*\/?>)?\s*(?:<\/div>)?/i,
  );
  if (combinedParagraphMatch) {
    const extractedCandidate = normalizeComparableText(combinedParagraphMatch[1]);
    if (extractedCandidate && isDuplicateExcerptText(extractedCandidate, normalizedExcerpt)) {
      return html.slice(combinedParagraphMatch[0].length).trimStart();
    }
  }

  const splitExcerptMatch = html.match(
    /^\s*(?:<div\b[^>]*>\s*)?<(h[1-6]|p)\b[^>]*>([\s\S]*?)<\/\1>\s*(<p\b[^>]*>[\s\S]*?<\/p>)(\s*<hr\b[^>]*\/?>)?\s*(?:<\/div>)?/i,
  );
  if (!splitExcerptMatch) {
    return html;
  }

  const headingText = normalizeComparableText(splitExcerptMatch[2]);
  if (!isExcerptLabel(headingText)) {
    return html;
  }

  const paragraphText = normalizeComparableText(splitExcerptMatch[3]);
  if (!isDuplicateExcerptText(paragraphText, normalizedExcerpt)) {
    return html;
  }

  return html.slice(splitExcerptMatch[0].length).trimStart();
}
