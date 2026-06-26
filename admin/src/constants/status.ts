/**
 * Status → visual token maps. Semantic Tailwind classes only (resolve to the
 * active theme). Reused by StatusBadge and any module list. Lower-case keys match
 * the backend enum transport (reconciliation C7).
 */

import type { HighlightType, PublicationState } from '@/types/common';

export type StatusTone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

export const PUBLICATION_STATE_TONE: Record<PublicationState, StatusTone> = {
  draft: 'muted',
  published: 'success',
  unpublished: 'warning',
  archived: 'danger',
};

export const PUBLICATION_STATE_LABEL: Record<PublicationState, string> = {
  draft: 'Draft',
  published: 'Published',
  unpublished: 'Unpublished',
  archived: 'Archived',
};

export const HIGHLIGHT_TONE: Record<HighlightType, StatusTone> = {
  new: 'info',
  latest: 'info',
  important: 'warning',
  urgent: 'danger',
  featured: 'success',
};

export const HIGHLIGHT_LABEL: Record<HighlightType, string> = {
  new: 'New',
  latest: 'Latest',
  important: 'Important',
  urgent: 'Urgent',
  featured: 'Featured',
};

/** Maps a tone to its badge utility classes (used by StatusBadge/Badge). */
export const TONE_CLASSES: Record<StatusTone, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
  muted: 'bg-muted text-muted-foreground',
};
