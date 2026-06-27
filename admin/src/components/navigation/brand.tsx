import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/constants/routes';
import { APP } from '@/constants/app';

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href={ROUTES.dashboard}
      className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${APP.name} home`}
    >
      <Image
        src="/logo-sidhkofed.png"
        alt="SIDHKOFED"
        width={32}
        height={32}
        className="shrink-0 rounded-sm"
        priority
      />
      {!collapsed ? (
        <span className={cn('flex flex-col leading-none')}>
          <span className="text-sm font-semibold text-foreground">{APP.shortName}</span>
          <span className="text-[11px] text-muted-foreground">CMS Admin</span>
        </span>
      ) : null}
    </Link>
  );
}
