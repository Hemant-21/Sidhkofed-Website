import { describe, expect, it } from 'vitest';
import { inferSettingKind, settingLabel } from './types';

describe('inferSettingKind', () => {
  it('returns boolean for boolean values', () => {
    expect(inferSettingKind('site.show_banner', true)).toBe('boolean');
    expect(inferSettingKind('site.show_banner', false)).toBe('boolean');
  });

  it('returns number for numeric values', () => {
    expect(inferSettingKind('limits.max_upload_size', 10)).toBe('number');
    expect(inferSettingKind('limits.count', 0)).toBe('number');
  });

  it('returns stringArray for string arrays', () => {
    expect(inferSettingKind('site.tags', ['a', 'b'])).toBe('stringArray');
  });

  it('returns json for mixed or object arrays', () => {
    expect(inferSettingKind('site.data', [1, 'two'])).toBe('json');
    expect(inferSettingKind('site.config', { foo: 'bar' })).toBe('json');
  });

  it('returns language for default_language keys', () => {
    expect(inferSettingKind('translation.default_language', 'en')).toBe('language');
  });

  it('returns url for url-containing keys', () => {
    expect(inferSettingKind('social.twitter_url', 'https://x.com')).toBe('url');
    expect(inferSettingKind('site.homepage_url', 'https://example.com')).toBe('url');
  });

  it('returns text for description / address / copyright keys', () => {
    expect(inferSettingKind('contact.address', 'New Delhi')).toBe('text');
    expect(inferSettingKind('site.description', 'A great site')).toBe('text');
    expect(inferSettingKind('footer.copyright', '2025')).toBe('text');
  });

  it('falls back to string for generic string values', () => {
    expect(inferSettingKind('site.title', 'SIDHKOFED')).toBe('string');
    expect(inferSettingKind('contact.phone', '+91-11-XXXX')).toBe('string');
  });

  it('returns string for null values', () => {
    expect(inferSettingKind('site.hero_image', null)).toBe('string');
  });
});

describe('settingLabel', () => {
  it('strips group prefix and humanizes', () => {
    expect(settingLabel('contact.office_name')).toBe('Office Name');
    expect(settingLabel('site.title')).toBe('Title');
  });

  it('handles key without a dot', () => {
    expect(settingLabel('max_file_size')).toBe('Max File Size');
  });

  it('uppercases URL, SEO, KPI, ID abbreviations', () => {
    expect(settingLabel('site.homepage_url')).toBe('Homepage URL');
    expect(settingLabel('seo.meta_description')).toBe('Meta Description');
    expect(settingLabel('site.seo_title')).toBe('SEO Title');
    expect(settingLabel('site.kpi_count')).toBe('KPIs Count');
    expect(settingLabel('user.record_id')).toBe('Record ID');
  });

  it('handles underscores as word separators', () => {
    expect(settingLabel('limits.max_upload_size')).toBe('Max Upload Size');
  });
});
