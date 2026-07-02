import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArticleJsonLd, FaqJsonLd } from './json-ld';

/**
 * JSON-LD is injected via dangerouslySetInnerHTML with CMS-sourced values, so a
 * malicious title/answer must NOT be able to break out of the <script> block.
 * The serializer escapes `<`, `>`, `&` (and U+2028/U+2029) to unicode escapes.
 */
describe('JSON-LD serializer — script-tag breakout defense', () => {
  it('escapes a </script> breakout attempt in a headline', () => {
    const html = renderToStaticMarkup(
      <ArticleJsonLd headline={'</script><script>alert(1)</script>'} url="/news/x" />,
    );
    // Exactly one opening + one closing application/ld+json script tag; no injected one.
    expect(html).toContain('type="application/ld+json"');
    expect(html.match(/<script/g)?.length).toBe(1);
    expect(html).not.toContain('</script><script>alert(1)');
    expect(html).toContain('\\u003c'); // the < was escaped
  });

  it('escapes breakout attempts inside FAQ answers', () => {
    const html = renderToStaticMarkup(
      <FaqJsonLd items={[{ question: 'Q', answer: '</script><img src=x onerror=alert(1)>' }]} />,
    );
    // Only the single ld+json script tag; angle brackets are escaped so the <img>
    // and </script> stay inert text inside the JSON string (cannot break out).
    expect(html.match(/<script/g)?.length).toBe(1);
    expect(html).not.toContain('</script><img');
    expect(html).toContain('\\u003c'); // < was escaped
    expect(html).toContain('\\u003e'); // > was escaped
  });

  it('still emits valid, parseable JSON-LD for clean input', () => {
    const html = renderToStaticMarkup(<ArticleJsonLd headline="Clean title" url="/news/clean" />);
    const json = html.replace(/^.*?>(.*)<\/script>$/s, '$1');
    const decoded = json
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\u0026/g, '&');
    const parsed = JSON.parse(decoded);
    expect(parsed['@type']).toBe('NewsArticle');
    expect(parsed.headline).toBe('Clean title');
  });
});
