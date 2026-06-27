import { describe, it, expect } from 'vitest';
import { sanitizeHtml, stripTags } from './sanitize-html';

describe('sanitizeHtml — XSS defense', () => {
  it('removes <script> blocks', () => {
    const clean = sanitizeHtml('<p>ok</p><script>alert(1)</script>');
    expect(clean).toContain('<p>ok</p>');
    expect(clean.toLowerCase()).not.toContain('<script');
    expect(clean).not.toContain('alert(1)');
  });

  it('strips inline event handlers (onclick, onerror, onload)', () => {
    expect(sanitizeHtml('<p onclick="steal()">Hi</p>')).not.toContain('onclick');
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).not.toContain('onerror');
    expect(sanitizeHtml('<svg onload="alert(1)"></svg>').toLowerCase()).not.toContain('onload');
  });

  it('neutralizes javascript: URIs — quoted', () => {
    expect(sanitizeHtml('<a href="javascript:evil()">x</a>')).not.toContain('javascript:');
  });

  it('neutralizes javascript: URIs — UNQUOTED (regex sanitizer bypass)', () => {
    expect(sanitizeHtml('<a href=javascript:alert(1)>x</a>')).not.toContain('javascript:');
  });

  it('neutralizes entity/whitespace-obfuscated javascript: URIs', () => {
    expect(sanitizeHtml('<a href="jav&#x09;ascript:alert(1)">x</a>').toLowerCase()).not.toContain('javascript:');
    expect(sanitizeHtml('<a href="  javascript:alert(1)">x</a>').toLowerCase()).not.toContain('javascript:');
  });

  it('rejects vbscript: and data: URIs', () => {
    expect(sanitizeHtml('<a href="vbscript:msgbox(1)">x</a>').toLowerCase()).not.toContain('vbscript:');
    expect(sanitizeHtml('<a href="data:text/html,<b>x</b>">x</a>').toLowerCase()).not.toContain('data:text/html');
    expect(sanitizeHtml('<img src="data:image/svg+xml;base64,PHN2Zz4=">')).not.toContain('data:');
  });

  it('drops dangerous elements: iframe, object, embed, form, svg, math, link, meta, base', () => {
    const dirty =
      '<iframe src="evil"></iframe><object data="x"></object><embed src="x">' +
      '<form action="/x"><input></form><svg><script>1</script></svg><math></math>' +
      '<link rel="import" href="x"><meta http-equiv="refresh"><base href="//evil">';
    const clean = sanitizeHtml(dirty).toLowerCase();
    for (const tag of ['iframe', 'object', 'embed', 'form', '<input', 'svg', 'math', '<link', '<meta', '<base']) {
      expect(clean).not.toContain(tag);
    }
  });

  it('neutralizes nested/mutation XSS (<scr<script>ipt>)', () => {
    // No executable <script> element survives; any leftover "alert(1)" is inert,
    // escaped text content (not a script), which is safe.
    const clean = sanitizeHtml('<scr<script>ipt>alert(1)</scr</script>ipt>');
    expect(clean.toLowerCase()).not.toContain('<script');
    expect(clean.toLowerCase()).not.toContain('<scr');
  });

  it('strips inline styles (expression / unsafe css)', () => {
    expect(sanitizeHtml('<p style="background:url(javascript:alert(1))">x</p>')).not.toContain('style');
  });

  it('preserves approved formatting tags and safe links', () => {
    const clean = sanitizeHtml(
      '<h2>Title</h2><p><strong>bold</strong> <em>em</em></p><ul><li>a</li></ul>' +
        '<a href="/local">local</a><a href="mailto:x@y.z">mail</a>',
    );
    expect(clean).toContain('<h2>');
    expect(clean).toContain('<strong>');
    expect(clean).toContain('<li>');
    expect(clean).toContain('href="/local"');
    expect(clean).toContain('mailto:x@y.z');
  });

  it('forces rel="noopener noreferrer nofollow" + target on external links', () => {
    const clean = sanitizeHtml('<a href="https://evil.example/x">x</a>');
    expect(clean).toContain('href="https://evil.example/x"');
    expect(clean).toContain('rel="noopener noreferrer nofollow"');
    expect(clean).toContain('target="_blank"');
  });

  it('hardens author-supplied target="_blank" without noopener', () => {
    const clean = sanitizeHtml('<a href="https://x.example" target="_blank">x</a>');
    expect(clean).toContain('rel="noopener noreferrer nofollow"');
  });

  it('returns empty string for nullish input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });
});

describe('stripTags', () => {
  it('reduces HTML to collapsed plain text', () => {
    expect(stripTags('<h2>Title</h2>\n<p>Body  text</p>')).toBe('Title Body text');
  });

  it('removes scripts before stripping (no leaked code)', () => {
    expect(stripTags('<p>safe</p><script>alert(1)</script>')).toBe('safe');
  });

  it('decodes common entities to real text', () => {
    expect(stripTags('<p>A &amp; B &lt;C&gt;</p>')).toBe('A & B <C>');
  });

  it('returns empty for nullish', () => {
    expect(stripTags(null)).toBe('');
  });
});
