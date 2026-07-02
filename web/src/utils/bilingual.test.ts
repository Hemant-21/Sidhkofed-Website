import { describe, it, expect } from 'vitest';
import { pickText, pickField, isAutoTranslated } from './bilingual';

describe('pickText', () => {
  it('returns Hindi when requested and present', () => {
    expect(pickText('Lac', 'लाख', 'hi')).toBe('लाख');
  });
  it('falls back to English when Hindi missing', () => {
    expect(pickText('Lac', null, 'hi')).toBe('Lac');
    expect(pickText('Lac', '   ', 'hi')).toBe('Lac');
  });
  it('returns English in English mode', () => {
    expect(pickText('Lac', 'लाख', 'en')).toBe('Lac');
  });
  it('falls back to Hindi when English missing in English mode', () => {
    expect(pickText(null, 'लाख', 'en')).toBe('लाख');
  });
  it('returns empty string when both missing', () => {
    expect(pickText(null, null, 'en')).toBe('');
  });
});

describe('pickField', () => {
  it('reads <base>_en / <base>_hi by base name', () => {
    const row = { title_en: 'Annual report', title_hi: 'वार्षिक रिपोर्ट' };
    expect(pickField(row, 'title', 'hi')).toBe('वार्षिक रिपोर्ट');
    expect(pickField(row, 'title', 'en')).toBe('Annual report');
  });
  it('handles null rows', () => {
    expect(pickField(null, 'title', 'en')).toBe('');
  });
});

describe('isAutoTranslated', () => {
  it('only flags automatic Hindi', () => {
    expect(isAutoTranslated('automatic', 'hi')).toBe(true);
    expect(isAutoTranslated('automatic', 'en')).toBe(false);
    expect(isAutoTranslated('manual', 'hi')).toBe(false);
  });
});
