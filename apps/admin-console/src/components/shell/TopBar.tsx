interface TopBarProps {
  title: string;
  screenId: string;
  ref_?: string;
  slug?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, screenId, slug, actions }: TopBarProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <h1 className="text-2xl font-bold text-[#1A1D1F] leading-tight">{title}</h1>
      <span className="text-[13px] font-semibold text-[#0B5C66] bg-[#DEF3F5] px-2.5 py-0.5 rounded">
        {screenId}
      </span>
      {/* UAT #5: internal spec references (PRD section IDs like "G4"/"FR-ADM-PRV-001")
          previously rendered on every screen for every user. `ref_` is kept as a prop
          (still useful for devs reading the source / a future dev-mode toggle) but is
          intentionally no longer rendered in the shipped UI. */}
      {slug && (
        <span className="ml-auto text-[12px] text-[#7C8388] font-mono hidden xl:block">
          console.healthcoordination.in/{slug}
        </span>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
