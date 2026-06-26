import { sanitizeHtml } from '@/utils/sanitize-html';
import { cn } from '@/utils/cn';

/**
 * Render sanitized CMS rich text. Server-safe (sanitizes before injection). The
 * `.prose-content` class (globals.css) styles headings/lists/tables/links.
 */
export function RichText({
  html,
  lang,
  className,
}: {
  html: string | null | undefined;
  lang?: 'en' | 'hi';
  className?: string;
}) {
  const clean = sanitizeHtml(html);
  if (!clean) return null;
  return (
    <div
      className={cn('prose-content max-w-none text-foreground', className)}
      lang={lang}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
