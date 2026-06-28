function Connector() {
  return (
    <div className="flex justify-center py-0.5">
      <div className="relative h-7 w-px bg-border">
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-border" />
      </div>
    </div>
  );
}

export function CooperativeStructure() {
  return (
    <div className="w-full max-w-sm">

      {/* Tier 1 — Apex */}
      <div className="rounded-xl bg-primary px-5 py-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
          01 · Apex — State Level
        </p>
        <p className="mt-1 text-base font-black text-white">SIDHKOFED</p>
        <p className="mt-0.5 text-xs text-white/60">
          Sidho-Kanho Agriculture and Forest Produce State Cooperative Federation
        </p>
      </div>

      <Connector />

      {/* Tier 2 — District */}
      <div className="rounded-xl border border-primary/25 bg-primary/10 px-5 py-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
          02 · District Level
        </p>
        <p className="mt-1 text-base font-bold text-foreground">District Cooperative Unions</p>
        <p className="mt-0.5 text-xs text-muted-foreground">24 districts across Jharkhand</p>
      </div>

      <Connector />

      {/* Tier 3 — Panchayat */}
      <div className="rounded-xl border border-accent/30 bg-accent/10 px-5 py-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-accent/70">
          03 · Panchayat Level
        </p>
        <p className="mt-1 text-base font-bold text-foreground">
          Multi Purpose Cooperative Societies (MPCS)
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">4,454 MPCS (LAMPS / PACS)</p>
      </div>

    </div>
  );
}
