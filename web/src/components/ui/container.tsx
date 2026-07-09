import { cn } from '@/utils/cn';

/**
 * Centered max-width page container with responsive gutters.
 *
 * Vertical-padding convention (pass as part of `className`, e.g. `py-12`):
 * - Hero/header bands (`bg-primary` title band): `py-10 sm:py-14`
 * - Dense listing/detail pages (Activities, Procurement, Notifications, Impact,
 *   Publications, search, digital-services, gallery/video detail, dashboard): `py-8`
 * - Rich informational pages (About, Membership, and their sub-pages): `py-12`
 * - Homepage sections: `py-14`
 * Pick the tier matching the page's family rather than a one-off value.
 */
export function Container({
  className,
  id,
  children,
}: {
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return <div id={id} className={cn('mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}
