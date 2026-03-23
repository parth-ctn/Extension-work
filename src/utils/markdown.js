import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import katex from "katex";
import * as beautify from "js-beautify";

// Configure marked for common GitHub-style markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Convert "- item" patterns inside <td> into <li> for nicer tables
marked.use({
  hooks: {
    postprocess(html) {
      try {
        return String(html).replace(/<td>\s*-\s*(.*?)<\/td>/g, "<td><li>$1</li></td>");
      } catch {
        return html;
      }
    },
  },
});

const jsBeautify = beautify.js || beautify.js_beautify || ((s) => s);

function insertSoftBreaks(mathText) {
  try {
    return String(mathText).replace(/(.{40})/g, "$1\\\\allowbreak ");
  } catch {
    return mathText;
  }
}

function looksLikeProgrammingCode(text) {
  return /(^|\n)\s*(public\s+class|#include|System\.out|int\s+\w+|for\s*\(|while\s*\(|if\s*\(|function\s+\w+|=>|console\.log|import\s+|class\s+|new\s+)/.test(
    text || ""
  );
}

function containsLatexTriggers(text) {
  if (!text) return false;
  // common LaTeX commands and delimiters
  if (/[\\](frac|sum|int|sqrt|alpha|beta|gamma|theta|lambda|mu|omega|text|left|right)\b/.test(text))
    return true;
  if (/\$\$[\s\S]+?\$\$/.test(text)) return true; // display math
  if (/\\\([\s\S]+?\\\)/.test(text)) return true; // inline \( \)
  if (/\\\[[\s\S]+?\\\]/.test(text)) return true; // display \[ \]
  // Inline $...$ but try to avoid plain currency-like usage
  if (/(^|\s)\$[^$\s].*?[^$\s]\$(?=\s|$)/.test(text)) return true;
  return false;
}

function renderTextMathSegments(text) {
  // Replace math-delimited segments within plain text using KaTeX
  if (!text) return null;

  const patterns = [
    { re: /\$\$([\s\S]+?)\$\$/g, display: true },
    { re: /\\\[([\s\S]+?)\\\]/g, display: true },
    { re: /\\\(([\s\S]+?)\\\)/g, display: false },
    // cautious inline $...$ — exclude cases like $100 or $ var
    { re: /(^|\s)\$([^$\s][\s\S]*?[^$\s])\$(?=\s|$)/g, display: false, hasLead: true },
  ];

  let changed = false;
  let html = String(text);
  for (const pat of patterns) {
    const next = html.replace(pat.re, (m, a, b) => {
      const src = pat.hasLead ? b : a;
      try {
        const safe = insertSoftBreaks(src);
        const rendered = katex.renderToString(safe, {
          displayMode: pat.display,
          throwOnError: false,
        });
        changed = true;
        return pat.hasLead ? `${a}${rendered}` : rendered;
      } catch {
        return m; // leave original if KaTeX fails
      }
    });
    html = next;
  }

  if (changed) return html;

  // Fallback: if text contains LaTeX triggers (e.g., "\\int_0^1 x dx") with no delimiters
  if (containsLatexTriggers(text) && !looksLikeProgrammingCode(text)) {
    try {
      const display = /\\(frac|sum|int|begin)\b|\n/.test(text);
      const rendered = katex.renderToString(insertSoftBreaks(text), {
        displayMode: display,
        throwOnError: false,
      });
      return rendered;
    } catch {
      // ignore and fall through
    }
  }

  return null;
}

function renderAllFormulas(htmlString) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return htmlString || "";
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(htmlString || ""), "text/html");

    function traverse(node) {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const raw = child.textContent || "";
          const replaced = renderTextMathSegments(raw);
          if (replaced && replaced !== raw) {
            const span = document.createElement("span");
            span.innerHTML = replaced;
            child.parentNode?.replaceChild(span, child);
          }
          return;
        }

        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = /** @type {HTMLElement} */ (child);
          const tag = el.tagName.toLowerCase();
          if (tag === "code" || tag === "pre") {
            const text = el.textContent?.trim() || "";
            if (text && containsLatexTriggers(text) && !looksLikeProgrammingCode(text)) {
              try {
                const rendered = katex.renderToString(insertSoftBreaks(text), {
                  displayMode: /\n/.test(text) || /\\(frac|sum|int)\b/.test(text),
                  throwOnError: false,
                });
                el.innerHTML = rendered;
              } catch {}
            }
            return; // do not traverse into code/pre
          }
          traverse(child);
        }
      });
    }

    traverse(doc.body);
    return doc.body.innerHTML;
  } catch {
    return htmlString || "";
  }
}

function formatCodeBlocks(html) {
  if (!html) return "";
  return String(html).replace(
    /<pre><code(?:\s+class=\"([^\"]*)\")?>([\s\S]*?)<\/code><\/pre>/g,
    (match, classAttr, codeInner) => {
      try {
        const textarea = typeof document !== "undefined" ? document.createElement("textarea") : null;
        if (!textarea) return match;
        textarea.innerHTML = codeInner;
        let decoded = textarea.value || "";
        decoded = decoded.trim();
        if (!decoded) return match;

        // Determine language from class attribute if present
        let lang = "";
        if (classAttr) {
          const m = classAttr.match(/language-([a-z0-9+_-]+)/i);
          if (m) lang = m[1].toLowerCase();
        }

        // Only beautify JS/TS/JSON-like code to avoid mangling bash
        const jsLike = ["js", "javascript", "ts", "typescript", "json"]; 
        if (jsLike.includes(lang) || (!lang && /[;=(){}]/.test(decoded))) {
          try {
            decoded = jsBeautify(decoded, {
              indent_size: 2,
              preserve_newlines: true,
              max_preserve_newlines: 2,
              space_in_empty_paren: false,
              end_with_newline: false,
            });
          } catch {}
        }

        // Syntax highlight
        let highlighted;
        try {
          if (lang && hljs.getLanguage(lang)) {
            highlighted = hljs.highlight(decoded, { language: lang }).value;
          } else {
            highlighted = hljs.highlightAuto(decoded).value;
          }
        } catch {
          highlighted = decoded
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        }

        const languageClass = lang ? ` language-${lang}` : "";
        // Wrap with toolbar + copy button for per-block copying
        return `
<figure class=\"wm-codeblock\">
  <div class=\"wm-codeblock__toolbar\">
    <button type=\"button\" class=\"wm-codeblock__copy\" aria-label=\"Copy code\" title=\"Copy code\">
      <svg class=\"wm-codeblock__icon wm-codeblock__icon--copy\" width=\"14\" height=\"14\" viewBox=\"0 0 20 18\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">
        <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M7 1.75C7 0.783502 7.7835 0 8.75 0H17.25C18.2165 0 19 0.783502 19 1.75V12.25C19 13.2165 18.2165 14 17.25 14H16V15.75C16 16.7165 15.2165 17.5 14.25 17.5H2.75C1.7835 17.5 1 16.7165 1 15.75V6.25C1 5.2835 1.7835 4.5 2.75 4.5H4.5V1.75C4.5 0.783502 5.2835 0 6.25 0H7ZM7 4.5H14.25C15.2165 4.5 16 5.2835 16 6.25V12.5H17.25C17.3881 12.5 17.5 12.3881 17.5 12.25V1.75C17.5 1.61193 17.3881 1.5 17.25 1.5H8.75C8.61193 1.5 8.5 1.61193 8.5 1.75V4.5H7ZM2.75 6C2.61193 6 2.5 6.11193 2.5 6.25V15.75C2.5 15.8881 2.61193 16 2.75 16H14.25C14.3881 16 14.5 15.8881 14.5 15.75V6.25C14.5 6.11193 14.3881 6 14.25 6H2.75Z\" fill=\"currentColor\"></path>
      </svg>
      <svg class=\"wm-codeblock__icon wm-codeblock__icon--check\" width=\"14\" height=\"14\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">
        <path d=\"M16.53 6.28a.75.75 0 0 0-1.06-1.06L8.25 12.44 5.53 9.72a.75.75 0 1 0-1.06 1.06l3.25 3.25a.75.75 0 0 0 1.06 0l7.75-7.75Z\" fill=\"currentColor\"></path>
      </svg>
    </button>
  </div>
  <pre><code class=\"hljs${languageClass}\">${highlighted}</code></pre>
</figure>`;
      } catch {
        return match;
      }
    }
  );
}

/**
 * Convert Markdown to sanitized HTML for safe rendering in the chat UI.
 * Falls back to empty string if input is falsy.
 *
 * @param {string} markdown
 * @returns {string} sanitized HTML
 */
export function renderMarkdownToHtml(markdown) {
  try {
    if (!markdown) return "";
    // Step 1: Markdown -> raw HTML
    const rawHtml = marked.parse(String(markdown));
    // Step 2: sanitize raw HTML (defense-in-depth)
    const sanitized = DOMPurify.sanitize(rawHtml);
    // Step 3: render LaTeX/KaTeX segments
    const withFormulas = renderAllFormulas(sanitized);
    // Step 4: beautify + highlight <pre><code> blocks (bash/js/etc.)
    const formatted = formatCodeBlocks(withFormulas);
    return formatted;
  } catch {
    return "";
  }
}
