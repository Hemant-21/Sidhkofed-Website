/**
 * YouTube URL parsing/validation (pure). YouTube-only video strategy — no file hosting.
 * Accepts watch / youtu.be / embed / shorts URLs, extracts the 11-char id, and derives
 * the canonical URL + default thumbnail (API spec §6 videos / validate-url).
 */
const ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const ALLOWED_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be',
]);

export interface ParsedYouTube {
  youtubeId: string;
  canonicalUrl: string;
  thumbnailUrl: string;
}

/** Parse + validate a YouTube URL, or return null when it is not an accepted YouTube link. */
export function parseYouTubeUrl(raw: string): ParsedYouTube | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return null;

  let id: string | null = null;
  if (host.endsWith('youtu.be')) {
    id = url.pathname.slice(1).split('/')[0] ?? null;
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v');
  } else if (url.pathname.startsWith('/embed/')) {
    id = url.pathname.slice('/embed/'.length).split('/')[0] ?? null;
  } else if (url.pathname.startsWith('/shorts/')) {
    id = url.pathname.slice('/shorts/'.length).split('/')[0] ?? null;
  } else if (url.pathname.startsWith('/v/')) {
    id = url.pathname.slice('/v/'.length).split('/')[0] ?? null;
  }

  if (!id || !ID_RE.test(id)) return null;
  return {
    youtubeId: id,
    canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}
