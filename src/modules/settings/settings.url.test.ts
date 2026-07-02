/** Unit tests — safe URL validation for footer/social/contact settings (remediation Issue 8). */
import { describe, it, expect } from 'vitest';
import { SETTINGS_CATALOG } from './settings.catalog';

const footer = SETTINGS_CATALOG['footer.important_links'].schema;
const social = SETTINGS_CATALOG['social.facebook_url'].schema;

const link = (url: string) => [{ label_en: 'Link', url }];

describe('footer.important_links url validation', () => {
  it('accepts https/http absolute URLs', () => {
    expect(footer.safeParse(link('https://sidhkofed.example/policy')).success).toBe(true);
    expect(footer.safeParse(link('http://sidhkofed.example')).success).toBe(true);
  });

  it('accepts an approved /relative path', () => {
    expect(footer.safeParse(link('/about-us')).success).toBe(true);
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'vbscript:msgbox', '//evil.example', 'ftp://x'])(
    'rejects unsafe scheme "%s"',
    (url) => {
      expect(footer.safeParse(link(url)).success).toBe(false);
    },
  );
});

describe('social url validation', () => {
  it('accepts https and empty string', () => {
    expect(social.safeParse('https://facebook.com/sidhkofed').success).toBe(true);
    expect(social.safeParse('').success).toBe(true);
  });
  it('rejects javascript: scheme', () => {
    expect(social.safeParse('javascript:alert(1)').success).toBe(false);
  });
});
