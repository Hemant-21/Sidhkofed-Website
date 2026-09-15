import { ValidationError } from './errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Reference = { id: string } | { slug: string };

/** OR within a reference filter; callers combine different fields with AND.
 * Retains the existing single UUID/slug contract and never drops unknown values.
 */
export function referenceFilter(value: string): Reference | { OR: Reference[] } {
  const values = [...new Set(value.split(',').map((part) => part.trim()))];
  if (values.length > 100 || values.some((part) => part.length === 0)) {
    throw new ValidationError({ filter: ['Select between 1 and 100 non-empty values.'] });
  }
  const references = values.map((part): Reference => UUID_RE.test(part) ? { id: part } : { slug: part });
  return references.length === 1 ? references[0]! : { OR: references };
}
