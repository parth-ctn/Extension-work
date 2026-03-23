/**
 * Check whether an HTML string contains a non-empty <body> element.
 * @param {string} html
 * @param {number} [minLen=32] - minimum innerHTML length (after trimming whitespace) to consider non-empty
 */
export function hasNonEmptyBody(html, minLen = 32) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html ?? ""), "text/html");
    const inner = doc?.body?.innerHTML ?? "";
    const stripped = String(inner).replace(/\s+/g, "").trim();
    return stripped.length >= minLen;
  } catch {
    return false;
  }
}

/**
 * Extract innerHTML of the body, or return the full string when no <body> exists.
 * @param {string} html
 */
export function getBodyInner(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html ?? ""), "text/html");
    return doc?.body?.innerHTML ?? String(html ?? "");
  } catch {
    return String(html ?? "");
  }
}

/**
 * Wrap provided body HTML into a minimal, valid HTML document.
 * @param {string} bodyHtml
 * @param {string} [title]
 */
export function wrapAsDocument(bodyHtml, title = "Untitled") {
  const safeTitle = String(title).replace(/[<>"'`]/g, (c) => ({"<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;","`":"&#96;"}[c]||c));
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8"/>\n<title>${safeTitle}</title>\n<meta name="viewport" content="width=device-width,initial-scale=1"/>\n</head>\n<body>\n${String(bodyHtml ?? "")}\n</body>\n</html>`;
}

/**
 * Ensure an HTML string serializes with a non-empty <body>.
 * If cleaning logic removed too much, fall back to the original body.
 * @param {string} candidateHtml - cleaned/transformed HTML
 * @param {string} originalHtml - original/raw HTML to fall back to
 * @param {string} [title]
 */
export function ensureNonEmptyBody(candidateHtml, originalHtml, title) {
  if (hasNonEmptyBody(candidateHtml)) return candidateHtml;
  const originalBody = getBodyInner(originalHtml);
  return wrapAsDocument(originalBody, title);
}

