'use client';

/** Renders a CMS Page (About, Vision, policies, etc.) bilingually. Static/
 *  institutional pages come from `/public/pages/{slug}` (codex §4.10). */

import type { PageDetail } from '@/lib/types/content';
import { BilingualTitle, BilingualBody } from '@/components/content/bilingual';

export function CmsPageBody({ page }: { page: PageDetail }) {
  return (
    <>
      <BilingualTitle en={page.title_en} hi={page.title_hi} />
      <BilingualBody en={page.body_en} hi={page.body_hi} />
    </>
  );
}
