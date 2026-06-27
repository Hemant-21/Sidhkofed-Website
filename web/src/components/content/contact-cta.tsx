import Link from 'next/link';

export function ContactCta() {
  return (
    <div className="mt-12 rounded-xl border border-border bg-muted/40 p-8 text-center">
      <p className="text-base font-semibold text-foreground">For Further Information</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Contact the SIDHKOFED office for queries about membership, procurement and cooperative services.
      </p>
      <Link
        href="/contact"
        className="mt-5 inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Contact Us →
      </Link>
    </div>
  );
}
