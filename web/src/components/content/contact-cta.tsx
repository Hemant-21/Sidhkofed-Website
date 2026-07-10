import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function ContactCta() {
  return (
    <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
      <h2 className="mb-2 text-xl font-bold text-foreground">For Further Information</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Contact the SIDHKOFED office for queries about membership, procurement and cooperative services.
      </p>
      <Link
        href="/contact"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
      >
        Contact Us
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
