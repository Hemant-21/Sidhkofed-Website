/**
 * Slug generation (pure, dependency-free). Slugs are generated once on create and stay
 * stable thereafter (build-context lifecycle rule). Uniqueness is enforced by the caller
 * against the table's unique constraint via `uniqueSlug`.
 */
import { randomUUID } from 'node:crypto';

/** Convert arbitrary text to a URL-safe slug (lower-kebab, ASCII). */
export function slugify(input: string): string {
  const base = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
  // Non-Latin titles (e.g. Hindi-only) reduce to empty — fall back to a short uuid.
  return base || `item-${randomUUID().slice(0, 8)}`;
}

/**
 * Produce a slug unique within a table by appending `-2`, `-3`, … when the candidate
 * already exists. `exists` is supplied by the caller's repository.
 */
export async function uniqueSlug(
  source: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(source);
  if (!(await exists(base))) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  // Pathological collision — guarantee uniqueness with a uuid suffix.
  return `${base}-${randomUUID().slice(0, 8)}`;
}
