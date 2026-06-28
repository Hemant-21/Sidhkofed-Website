import Link from 'next/link';
import { Container } from '@/components/ui/container';

const LINKS = [
  { num: '01', label: 'Training Programmes', href: '/activities/trainings' },
  { num: '02', label: 'Procurement', href: '/procurement' },
  { num: '03', label: 'Buyer Enquiry', href: '/procurement/enquiry' },
  { num: '04', label: 'Forms & Formats', href: '/publications/forms-formats' },
  { num: '05', label: 'Notices', href: '/notifications/notices' },
  { num: '06', label: 'Digital Services', href: '/digital-services' },
] as const;

export function QuickLinks() {
  return (
    <section aria-label="Quick access">
      <Container className="py-12">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Fast Pathways
          </p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">Quick Access</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {LINKS.map((link) => (
            <Link
              key={link.num}
              href={link.href}
              className="group relative rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary hover:shadow-sm"
            >
              <span className="block text-4xl font-black leading-none text-border transition-colors group-hover:text-primary/20">
                {link.num}
              </span>
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
