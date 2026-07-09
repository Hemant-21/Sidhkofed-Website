import Link from 'next/link';
import { GraduationCap, Package, Handshake, FileText, Bell, MonitorSmartphone } from 'lucide-react';
import { Container } from '@/components/ui/container';

const ICON_CLASS = 'h-5 w-5 text-primary';

const LINKS = [
  { icon: <GraduationCap className={ICON_CLASS} aria-hidden="true" />, label: 'Training Programmes', href: '/activities/trainings' },
  { icon: <Package className={ICON_CLASS} aria-hidden="true" />, label: 'Procurement', href: '/procurement' },
  { icon: <Handshake className={ICON_CLASS} aria-hidden="true" />, label: 'Buyer Enquiry', href: '/procurement/enquiry' },
  { icon: <FileText className={ICON_CLASS} aria-hidden="true" />, label: 'Forms & Formats', href: '/publications/forms-formats' },
  { icon: <Bell className={ICON_CLASS} aria-hidden="true" />, label: 'Notices', href: '/notifications/notices' },
  { icon: <MonitorSmartphone className={ICON_CLASS} aria-hidden="true" />, label: 'Digital Services', href: '/digital-services' },
];

export function QuickLinks() {
  return (
    <section aria-label="Quick access">
      <Container className="py-14">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Fast Pathways
          </p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">Quick Access</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative rounded-lg border border-border bg-surface p-5 transition-all hover:border-primary hover:shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                {link.icon}
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">
                {link.label}
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
