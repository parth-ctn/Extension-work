/**
 * Extract the innerHTML of the <body> from an HTML string.
 * Falls back to the full string if parsing fails.
 * @param {string} html
 * @returns {string}
 */
export function extractBodyInnerHtml(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html ?? ""), "text/html");
    return doc?.body?.innerHTML ?? "";
  } catch {
    return String(html ?? "");
  }
}

/**
 * Normalize HTML for comparison: trim, collapse whitespace, strip insignificant newlines.
 * @param {string} html
 * @returns {string}
 */
export function normalizeHtml(html) {
  const stripComments = (s) => String(s ?? "").replace(/<!--([\s\S]*?)-->/g, "");
  return stripComments(String(html ?? ""))
    // remove leading/trailing whitespace
    .trim()
    // collapse runs of whitespace (space, tab, newline) to a single space
    .replace(/[\t\n\r ]+/g, " ")
    // normalize &nbsp; to space
    .replace(/\u00a0/g, " ")
    // trim again after collapsing
    .trim();
}

/**
 * Compare bodies of two HTML documents after normalization.
 * @param {string} aHtml
 * @param {string} bHtml
 * @returns {boolean}
 */
export function areBodiesEqual(aHtml, bHtml) {
  const aBody = normalizeHtml(extractBodyInnerHtml(aHtml));
  const bBody = normalizeHtml(extractBodyInnerHtml(bHtml));
  return aBody === bBody;
}

/**
 * Parse and return the BODY element from an HTML string.
 * @param {string} html
 * @returns {HTMLElement|null}
 */
function getBodyElement(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html ?? ""), "text/html");
    return doc?.body ?? null;
  } catch {
    return null;
  }
}

function attrMap(el) {
  const map = new Map();
  if (!el || !el.attributes) return map;
  for (const attr of el.attributes) {
    map.set(attr.name, String(attr.value ?? ""));
  }
  return map;
}

function attributesDiffer(aEl, bEl) {
  const a = attrMap(aEl);
  const b = attrMap(bEl);
  if (a.size !== b.size) return true;
  for (const [k, v] of a.entries()) {
    if (!b.has(k) || b.get(k) !== v) return true;
  }
  return false;
}

function textContentNormalized(el) {
  return String(el?.textContent ?? "").replace(/[\t\n\r ]+/g, " ").trim();
}

function elementChildren(el) {
  return Array.from(el?.children ?? []);
}

/**
 * Recursively find the first changed element between two BODY subtrees.
 * Returns the pair of elements where the change is detected.
 * @param {Element} a
 * @param {Element} b
 * @returns {{a: Element|null, b: Element|null}|null}
 */
function findFirstChangedElement(a, b) {
  if (!a || !b) return { a: a ?? null, b: b ?? null };
  if (a.tagName !== b.tagName) return { a, b };
  if (attributesDiffer(a, b)) return { a, b };
  if (textContentNormalized(a) !== textContentNormalized(b)) return { a, b };

  const aKids = elementChildren(a);
  const bKids = elementChildren(b);
  const max = Math.max(aKids.length, bKids.length);
  for (let i = 0; i < max; i++) {
    const ak = aKids[i] ?? null;
    const bk = bKids[i] ?? null;
    if (!ak || !bk) return { a, b }; // structure change
    const diff = findFirstChangedElement(ak, bk);
    if (diff) return diff;
  }
  return null;
}

/**
 * Find the first changed tag (element) between two HTML bodies.
 * Returns the outerHTML of the changed element on both sides.
 * If no element-level change was isolated, returns the entire body outerHTML pair.
 * @param {string} previousHtml
 * @param {string} nextHtml
 * @returns {{beforeOuter: string, afterOuter: string}|null}
 */
export function findFirstChangedTag(previousHtml, nextHtml) {
  const prevBody = getBodyElement(previousHtml);
  const nextBody = getBodyElement(nextHtml);
  if (!prevBody || !nextBody) return null;

  const diff = findFirstChangedElement(prevBody, nextBody);
  if (diff?.a || diff?.b) {
    const beforeOuter = diff?.a ? diff.a.outerHTML : prevBody.outerHTML;
    const afterOuter = diff?.b ? diff.b.outerHTML : nextBody.outerHTML;
    return { beforeOuter, afterOuter };
  }

  // As a final fallback, compare normalized strings and return bodies if different
  const same = normalizeHtml(prevBody.innerHTML) === normalizeHtml(nextBody.innerHTML);
  if (!same) {
    return { beforeOuter: prevBody.outerHTML, afterOuter: nextBody.outerHTML };
  }
  return null;
}

