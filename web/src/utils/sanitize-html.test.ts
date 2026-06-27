import { describe, it, expect } from 'vitest';
import { sanitizeHtml, stripTags } from './sanitize-html';

describe('sanitizeHtml', () => {
  it('removes script blocks and event handlers (XSS defense)', () => {
    const dirty = '<p onclick="steal()">Hi</p><script>alert(1)</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('<p');
  });
  it('neutralizes javascript: URIs', () => {
    expect(sanitizeHtml('<a href="javascript:evil()">x</a>')).not.toContain('javascript:');
  });
  it('returns empty for nullish', () => {
    expect(sanitizeHtml(null)).toBe('');
  });
});

describe('stripTags', () => {
  it('reduces HTML to collapsed plain text', () => {
    expect(stripTags('<h2>Title</h2>\n<p>Body  text</p>')).toBe('Title Body text');
  });
});
