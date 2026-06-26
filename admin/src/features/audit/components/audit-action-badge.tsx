import { Badge } from '@/components/ui/badge';
import type { StatusTone } from '@/constants/status';
import { humanize } from '@/utils/format';
import { AUDIT_ACTION_LABEL, type AuditAction } from '../types';

/** Tone for an audit action (consistent with the dashboard Recent Activity styling). */
export function auditActionTone(action: string): StatusTone {
  if (/publish|create|restore/i.test(action)) return 'success';
  if (/unpublish|archive/i.test(action)) return 'warning';
  if (/delete|fail/i.test(action)) return 'danger';
  if (/login|update|replace|change/i.test(action)) return 'info';
  return 'default';
}

/** A consistently-toned, human-labelled badge for an audit action. */
export function AuditActionBadge({ action }: { action: string }) {
  const label = AUDIT_ACTION_LABEL[action as AuditAction] ?? humanize(action);
  return (
    <Badge tone={auditActionTone(action)} className="whitespace-nowrap">
      {label}
    </Badge>
  );
}
