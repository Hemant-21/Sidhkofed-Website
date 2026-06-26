import type { HighlightType, PublicationState } from '@/types/common';
import {
  HIGHLIGHT_LABEL,
  HIGHLIGHT_TONE,
  PUBLICATION_STATE_LABEL,
  PUBLICATION_STATE_TONE,
} from '@/constants/status';
import { Badge } from './badge';

/**
 * Publication-state badge. Status is conveyed by both color AND text (WCAG: never
 * color alone). Reused by every module list/detail — no module redefines states.
 */
export function StatusBadge({ state }: { state: PublicationState }) {
  return (
    <Badge tone={PUBLICATION_STATE_TONE[state]} dot>
      {PUBLICATION_STATE_LABEL[state]}
    </Badge>
  );
}

/** Highlight badge (new/latest/important/urgent/featured). */
export function HighlightBadge({ highlight }: { highlight: HighlightType }) {
  return <Badge tone={HIGHLIGHT_TONE[highlight]}>{HIGHLIGHT_LABEL[highlight]}</Badge>;
}
