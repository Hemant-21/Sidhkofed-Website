/**
 * Production-grade HTML sanitizer for CMS rich-text bodies (Phase 17.1 security
 * remediation). Backed by DOMPurify via `isomorphic-dompurify`, so the SAME
 * allow-list runs in Server Components (jsdom) and in client components (native
 * DOM) — the website renders editorial bodies in client components so the
 * language toggle can switch content without a refetch (see bilingual.tsx).
 *
 * Hard rules (deny-by-default):
 *   - Only the explicitly approved tags/attributes survive.
 *   - URL schemes are restricted to http(s), mailto and tel — `javascript:`,
 *     `vbscript:` and `data:` are rejected.
 *   - No inline event handlers, no inline styles, no SVG/MathML, no
 *     <script>/<style>/<iframe>/<object>/<embed>/<form>/<link>/<meta>/<base>.
 *   - Every external / new-tab link is forced to rel="noopener noreferrer
 *     nofollow" so editor-authored links cannot leak the opener or referrer.
 *
 * This is the ONLY sanitizer in the website. Do not add a second one and do not
 * inline ad-hoc HTML stripping elsewhere — call `sanitizeHtml`/`stripTags`.
 */
import DOMPurify from 'isomorphic-dompurify';

/** Explicitly approved structural + inline rich-text tags. */
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'small', 'sub', 'sup', 'mark', 'abbr',
  'code', 'pre', 'blockquote', 'cite', 'q',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'figure', 'figcaption', 'img',
];

/** Explicitly approved attributes. No `style`, no `on*`, no `data-*`. */
const ALLOWED_ATTR = [
  'href', 'title', 'target', 'rel',
  'lang', 'dir',
  'colspan', 'rowspan', 'scope', 'span',
  'start', 'reversed', 'type', 'value',
  'src', 'alt', 'width', 'height', 'loading',
];

/**
 * URL scheme allow-list: http(s), mailto, tel, plus relative/anchor URLs. This
 * is the standard DOMPurify-safe pattern with `data:`/`javascript:`/`vbscript:`
 * deliberately excluded.
 */
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

const TAGS_FORBIDDEN = [
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button',
  'textarea', 'select', 'option', 'link', 'meta', 'base', 'svg', 'math',
  'audio', 'video', 'source', 'track', 'noscript', 'template',
];

const ATTR_FORBIDDEN = ['style', 'srcset', 'formaction', 'xmlns'];

const SANITIZE_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_URI_REGEXP,
  FORBID_TAGS: TAGS_FORBIDDEN,
  FORBID_ATTR: ATTR_FORBIDDEN,
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: true,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  USE_PROFILES: { html: true }, // HTML only — never SVG or MathML
};

/** Schemes that must never appear in a URL attribute, even after DOMPurify. */
const UNSAFE_URI_SCHEME = /^(?:javascript|vbscript|data):/i;
/**
 * Control characters + whitespace (U+0000–U+0020), stripped before scheme matching
 * to defeat obfuscation such as `jav\tascript:`. Built from an ASCII string so the
 * source file carries no literal control characters.
 */
const URI_OBFUSCATION = new RegExp('[\\u0000-\\u0020]+', 'g');
/** URL-bearing attributes to police. */
const URI_ATTRS = ['href', 'src', 'xlink:href', 'action', 'formaction'];

// Belt-and-suspenders link hardening on the DOMPurify singleton. Registered once;
// `removeHook` first keeps it idempotent under HMR.
DOMPurify.removeHook('afterSanitizeAttributes');
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  const el = node as unknown as Element;
  if (typeof el.getAttribute !== 'function') return;

  // 1. Strip any URL attribute whose de-obfuscated value uses a forbidden scheme.
  for (const attr of URI_ATTRS) {
    const raw = el.getAttribute(attr);
    if (raw && UNSAFE_URI_SCHEME.test(raw.replace(URI_OBFUSCATION, ''))) {
      el.removeAttribute(attr);
    }
  }

  // 2. Force every external / new-tab anchor to be a safe link.
  if (el.nodeName === 'A' && el.getAttribute('href')) {
    const href = el.getAttribute('href') ?? '';
    const external = /^https?:\/\//i.test(href);
    if (external || el.getAttribute('target') === '_blank') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  }
});

/** Sanitize CMS rich text to the approved allow-list. Returns a safe HTML string. */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, SANITIZE_CONFIG) as unknown as string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'",
};

/** Decode the small set of entities that survive tag-stripping into plain text. */
function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z0-9#]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * Reduce HTML to collapsed plain text. Used where HTML is not allowed — meta
 * descriptions and JSON-LD text values. Sanitizes first (defence in depth), then
 * removes tags and decodes entities so the result is real text for those
 * already-escaped contexts.
 */
export function stripTags(html: string | null | undefined): string {
  if (!html) return '';
  const safe = sanitizeHtml(html);
  return decodeEntities(safe.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}
