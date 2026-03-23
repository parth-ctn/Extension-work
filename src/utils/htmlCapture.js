/**
 * Captures the rendered HTML of the current page (optimized for memory)
 * @returns {string} The main content HTML of the page (not full page to save memory)
 */
export function captureRenderedHtml() {
  // MEMORY OPTIMIZATION: Instead of capturing the entire page HTML which can be 5-20MB+,
  // we capture only the main content body to reduce memory usage by 80-90%

  // Try to find the main content container
  const mainContent =
    document.querySelector('main') ||
    document.querySelector('[role="main"]') ||
    document.querySelector('article') ||
    document.querySelector('#content') ||
    document.querySelector('.content') ||
    document.body;

  if (!mainContent) {
    // Fallback: Return a minimal HTML structure
    return `<!DOCTYPE html><html><head><title>${document.title}</title></head><body><p>Content not available</p></body></html>`;
  }

  // Clone the content to avoid modifying the original
  const clone = mainContent.cloneNode(true);

  // Remove heavy elements that aren't needed for analysis
  const elementsToRemove = [
    'script',       // Remove all scripts
    'style',        // Remove inline styles (keep external CSS references)
    'iframe',       // Remove iframes
    'video',        // Remove videos
    'audio',        // Remove audio
    'canvas',       // Remove canvas elements
    'svg',          // Remove large SVGs
    'img[src^="data:"]', // Remove base64 images
  ];

  elementsToRemove.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Remove inline event handlers to save space
  clone.querySelectorAll('[onclick], [onload], [onerror], [onmouseover]').forEach(el => {
    el.removeAttribute('onclick');
    el.removeAttribute('onload');
    el.removeAttribute('onerror');
    el.removeAttribute('onmouseover');
  });

  // Build minimal HTML structure
  const doctype = document.doctype ? `<!DOCTYPE ${document.doctype.name}>` : "";
  const title = document.title || "Untitled";
  const contentHtml = clone.innerHTML || clone.outerHTML;

  // Return optimized HTML (typically 200KB-2MB instead of 5-20MB)
  return `${doctype}
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="captured-url" content="${window.location.href}">
  <meta name="captured-at" content="${new Date().toISOString()}">
</head>
<body>
  ${contentHtml}
</body>
</html>`;
}

/**
 * Creates an HTML file blob from the captured HTML
 * @param {string} html - The HTML string to convert to a file
 * @param {string} filename - The name for the HTML file
 * @returns {File} A File object containing the HTML
 */
export function createHtmlFile(html, filename = "page.html") {
  const blob = new Blob([html], { type: "text/html" });
  return new File([blob], filename, { type: "text/html" });
}

/**
 * Generates a filename for the HTML file based on the page title or URL
 * @param {string} url - The current page URL
 * @param {string} title - The page title
 * @returns {string} A sanitized filename
 */
export function generateHtmlFilename(url, title) {
  // Use title if available, otherwise use hostname
  let baseName = title || "";

  if (!baseName) {
    try {
      baseName = new URL(url).hostname;
    } catch {
      baseName = "page";
    }
  }

  // Sanitize filename - remove invalid characters
  baseName = baseName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 100); // Limit length

  // Add timestamp to make it unique
  const timestamp = Date.now();

  return `${baseName}_${timestamp}.html`;
}

/**
 * Captures the current page as an HTML file
 * @param {string} url - The current page URL
 * @param {string} title - The page title
 * @returns {File} A File object containing the rendered HTML
 */
export function capturePageAsHtmlFile(url, title) {
  const html = captureRenderedHtml();
  const filename = generateHtmlFilename(url, title);
  return createHtmlFile(html, filename);
}
