/**
 * HTML cleaning utilities.
 * Provides two modes:
 * - cleanHtmlString: aggressive cleaning to isolate main content and strip chrome (nav/header/footer/ads)
 * - removeAdsOnlyFromHtml: conservative cleaning that keeps layout but removes ads and overlays
 */

/**
 * Parse an HTML string into a detached Document for safe manipulation.
 * @param {string} html
 * @returns {Document}
 */
function parseHtml(html) {
  const parser = new DOMParser();
  try {
    return parser.parseFromString(String(html || ""), "text/html");
  } catch {
    // Fallback minimal doc
    return parser.parseFromString("<!doctype html><html><head></head><body></body></html>", "text/html");
  }
}

/**
 * Remove all nodes matching any selector in the provided list from the given Document.
 * @param {Document} doc
 * @param {string[]} selectors
 */
function removeAll(doc, selectors) {
  selectors.forEach((selector) => {
    try {
      doc.querySelectorAll(selector).forEach((node) => node.remove());
    } catch {
      // ignore invalid selectors
    }
  });
}

/**
 * Remove overlay-like elements and obvious ad/sponsored blocks based on inline style, class or text.
 * @param {Document} doc
 */
function stripOverlaysAndAdText(doc) {
  const nodes = doc.querySelectorAll("*");
  nodes.forEach((node) => {
    const text = (node.textContent || "").trim();
    const inlineStyle = node.getAttribute("style") || "";
    const className = node.className || "";

    const looksFixed = /position\s*:\s*fixed/i.test(inlineStyle);
    const looksOverlay = /(modal|dialog|overlay|popup|toast|banner|subscribe)/i.test(
      className
    );
    const looksAdText = /(advertisement|sponsored)/i.test(text);

    if (looksFixed || looksOverlay || looksAdText) {
      node.remove();
    }
  });
}

/**
 * Build a minimal safe HTML document string from given Document and body content.
 * @param {Document} doc
 * @param {string} bodyHtml
 * @returns {string}
 */
function buildHtml(doc, bodyHtml) {
  const title = doc?.title || document?.title || "Cleaned Page";
  const lang =
    doc?.documentElement?.getAttribute("lang") ||
    document?.documentElement?.lang ||
    "en";
  const safeTitle = String(title).replace(/[<>"'`]/g, (char) => {
    const escapeMap = { "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };
    return escapeMap[char] || char;
  });
  const safeLang = String(lang).replace(/[^a-zA-Z-]/g, "");
  return `<!DOCTYPE html>\n<html lang="${safeLang}">\n<head>\n<meta charset="utf-8" />\n<title>${safeTitle}</title>\n<meta name="viewport" content="width=device-width,initial-scale=1" />\n</head>\n<body>\n${bodyHtml}\n</body>\n</html>`;
}

/**
 * Aggressively clean HTML to isolate the main content area and remove layout chrome.
 * This mirrors the logic in html-cleaner-extension/utils/cleaner.js but operates on a string input.
 * @param {string} html
 * @returns {string}
 */
export function cleanHtmlString(html) {
  try {
    const doc = parseHtml(html);

    // Remove ads, general nuisances and site chrome
    removeAll(doc, [
      "iframe[src*='ads']",
      "div[id*='ad']",
      "div[class*='ad']",
      "[class*='advert']",
      "[class*='sponsor']",
      ".popup",
      ".banner",
      ".promo",
      ".ad-container",
      ".cookie",
      ".newsletter",
      // Remove site chrome
      "nav",
      "footer",
      "aside",
      "header",
    ]);

    // Scripts and styles
    removeAll(doc, ["script", "style", "noscript", "link[rel='stylesheet']"]);

    // Remove overlays and ad text
    stripOverlaysAndAdText(doc);

    // Heuristic: pick the largest text container
    let bestNode = null;
    let bestScore = 0;
    doc.querySelectorAll("article, main, section, div").forEach((node) => {
      const score = (node.textContent || "").trim().length;
      if (score > bestScore) {
        bestScore = score;
        bestNode = node;
      }
    });

    const bodyContent = bestNode
      ? bestNode.outerHTML
      : doc.body?.outerHTML || "<p>No content found</p>";

    return buildHtml(doc, bodyContent);
  } catch (error) {
    console.error("Error during cleanHtmlString:", error);
    return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<title>Cleaning Error</title>\n</head>\n<body>\n<h1>Error</h1>\n<p>An error occurred while cleaning the page: ${String(
      error?.message || error
    )}</p>\n</body>\n</html>`;
  }
}

/**
 * Conservatively remove common ads and overlays while keeping the overall page structure
 * (headers, footers, nav) intact.
 * @param {string} html
 * @returns {string}
 */
export function removeAdsOnlyFromHtml(html) {
  try {
    const doc = parseHtml(html);

    // Remove common ad containers but DO NOT remove nav/header/footer/aside
    removeAll(doc, [
      "iframe[src*='ads']",
      "iframe[src*='doubleclick']",
      "iframe[src*='googlesyndication']",
      "[id*='ad-']",
      "[id*='ads-']",
      "[id^='ad_']",
      "[class*='ad-']",
      "[class*='-ad']",
      "[class*='advert']",
      "[class*='sponsor']",
      "[aria-label*='advert']",
      ".ad, .ads, .adsbox, .ad-container, .sponsored",
      ".cookie-banner, .cookie-consent",
      ".newsletter, .subscribe, .paywall",
    ]);

    // Remove heavy/irrelevant elements that commonly embed ads
    removeAll(doc, ["script", "noscript", "iframe[name='googlefcPresent']"]);

    // Remove overlays and ad text but keep layout elements
    stripOverlaysAndAdText(doc);

    // Keep original structure, but without inline base64 images to save size
    doc.querySelectorAll("img[src^='data:']").forEach((img) => img.remove());

    const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : "<!DOCTYPE html>";
    const title = doc.title || document?.title || "Untitled";
    const safeTitle = String(title).replace(/[<>"'`]/g, (char) => {
      const escapeMap = { "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };
      return escapeMap[char] || char;
    });

    return `${doctype}\n<html>${doc.head?.outerHTML || "<head><meta charset=\"utf-8\"/><title>" + safeTitle + "</title></head>"}${
      doc.body?.outerHTML || "<body></body>"
    }</html>`;
  } catch (error) {
    console.error("Error during removeAdsOnlyFromHtml:", error);
    return String(html || "");
  }
}

