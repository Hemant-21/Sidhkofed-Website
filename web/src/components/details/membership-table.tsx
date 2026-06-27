'use client';

/** Institutional membership directory (codex §4.15). Two independent axes
 *  (level × type); institutional records only — no personal/voting/dividend data. */

import type { MembershipSummary } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { humanizeEnum } from '@/utils/format';
import { Badge } from '@/components/ui/badge';

export function MembershipTable({ memberships }: { memberships: MembershipSummary[] }) {
  const { t, language } = useLanguage();

  if (memberships.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-muted-foreground">
        {t('memberships.empty')}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">{t('memberships.institution')}</th>
            <th scope="col" className="px-4 py-3 font-medium">{t('filter.level')}</th>
            <th scope="col" className="px-4 py-3 font-medium">{t('filter.membershipType')}</th>
            <th scope="col" className="px-4 py-3 font-medium">{t('filter.district')}</th>
            <th scope="col" className="px-4 py-3 font-medium">{t('filter.status')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {memberships.map((m) => (
            <tr key={m.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium text-foreground">
                {m.institution ? pickText(m.institution.name_en, m.institution.name_hi, language) : '—'}
                {m.membership_number && (
                  <span className="block text-xs font-normal text-muted-foreground">{m.membership_number}</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{humanizeEnum(m.membership_level)}</td>
              <td className="px-4 py-3 text-muted-foreground">{humanizeEnum(m.membership_type)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {m.district ? pickText(m.district.name_en, m.district.name_hi, language) : '—'}
              </td>
              <td className="px-4 py-3">
                <Badge tone={m.status === 'active' ? 'success' : 'neutral'}>{humanizeEnum(m.status)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
