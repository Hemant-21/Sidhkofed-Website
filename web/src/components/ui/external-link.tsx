import { ExternalLink as ExternalIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Safe external link. Always `rel="noopener noreferrer"` + `target="_blank"`
 * (codex: external/digital-service/GeM links open in a new tab safely). Appends an
 * accessible "(opens in a new tab)" hint and an external icon.
 */
export function ExternalLink({
  href,
  children,
  className,
  newTabLabel = 'opens in a new tab',
  showIcon = true,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  newTabLabel?: string;
  showIcon?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-flex items-center gap-1', className)}
    >
      {children}
      {showIcon && <ExternalIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      <span className="sr-only">({newTabLabel})</span>
    </a>
  );
}
