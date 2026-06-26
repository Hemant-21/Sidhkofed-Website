/**
 * Conservative HTML sanitizer for CMS rich-text bodies. Content originates from the
 * trusted admin CMS, but we still sanitize as defense-in-depth before injecting it
 * with `dangerouslySetInnerHTML` (codex security: escape HTML / prevent XSS).
 *
 * This runs in Server Components (no DOM), so it is regex-based and intentionally
 * strict: it removes dangerous elements wholesale and strips event-handler and
 * javascript: attributes. It is not a general-purpose sanitizer — it pairs with a
 * trusted source. If untrusted HTML is ever rendered, swap in a vetted library.
 */

const DANGEROUS_BLOCKS = /<\s*(script|style|iframe|object|embed|form|input|button|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
const SELF_CLOSING_DANGEROUS = /<\s*(script|style|iframe|object|embed|form|input|button|link|meta)\b[^>]*\/?>/gi;
const EVENT_HANDLERS = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URI = /\b(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi;

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(DANGEROUS_BLOCKS, '')
    .replace(SELF_CLOSING_DANGEROUS, '')
    .replace(EVENT_HANDLERS, '')
    .replace(JS_URI, '$1=$2#$2');
}
