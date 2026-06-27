export function CooperativeStructure() {
  return (
    <div className="my-8 max-w-lg">
      <div className="flex flex-col items-stretch gap-0">
        <div className="rounded-xl border-2 border-primary bg-primary/5 px-6 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Apex Level — State</p>
          <p className="mt-1 text-lg font-bold text-foreground">SIDHKOFED</p>
          <p className="text-sm text-muted-foreground">Sidho Kanho Birsa Multipurpose Cooperative Federation Ltd.</p>
        </div>

        <div className="flex justify-center">
          <div className="relative flex h-10 w-px flex-col items-center bg-border">
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-border" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface px-6 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">District Level</p>
          <p className="mt-1 text-base font-bold text-foreground">District Cooperative Unions</p>
          <p className="text-sm text-muted-foreground">24 districts across Jharkhand</p>
        </div>

        <div className="flex justify-center">
          <div className="relative flex h-10 w-px flex-col items-center bg-border">
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-border" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface px-6 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Village / Block Level</p>
          <p className="mt-1 text-base font-bold text-foreground">Primary Cooperative Societies</p>
          <p className="text-sm text-muted-foreground">LAMPS / PACS — direct beneficiary interface</p>
        </div>
      </div>
    </div>
  );
}
