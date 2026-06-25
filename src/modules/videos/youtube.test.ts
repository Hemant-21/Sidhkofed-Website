/** Unit tests — YouTube URL parsing (pure, no infrastructure). */
import { describe, it, expect } from 'vitest';
import { parseYouTubeUrl } from './youtube';

describe('parseYouTubeUrl', () => {
  const ID = 'dQw4w9WgXcQ';

  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://m.youtube.com/watch?v=${ID}&feature=share`,
  ])('accepts and normalizes %s', (url) => {
    const parsed = parseYouTubeUrl(url);
    expect(parsed).not.toBeNull();
    expect(parsed?.youtubeId).toBe(ID);
    expect(parsed?.canonicalUrl).toBe(`https://www.youtube.com/watch?v=${ID}`);
    expect(parsed?.thumbnailUrl).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
  });

  it.each([
    'https://vimeo.com/123456',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'not a url',
    'ftp://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short', // bad id length
    '',
  ])('rejects %s', (url) => {
    expect(parseYouTubeUrl(url)).toBeNull();
  });
});
