import { describe, it, expect } from 'vitest';
import { buildMetadata } from './seo';

describe('buildMetadata', () => {
  it('sets a canonical URL and Open Graph from backend content', () => {
    const meta = buildMetadata({
      title: 'Lac training',
      description: 'Two-day field training.',
      path: '/events/lac-training',
      image: 'https://cdn.example/cover.jpg',
      type: 'article',
    });
    expect(meta.alternates?.canonical).toMatch(/\/events\/lac-training$/);
    expect(String(meta.openGraph?.url)).toMatch(/\/events\/lac-training$/);
    expect((meta.openGraph as { type?: string }).type).toBe('article');
    expect(meta.twitter).toBeTruthy();
  });

  it('omits an empty description', () => {
    const meta = buildMetadata({ title: 'X', description: '  ', path: '/x' });
    expect(meta.description).toBeUndefined();
  });
});
