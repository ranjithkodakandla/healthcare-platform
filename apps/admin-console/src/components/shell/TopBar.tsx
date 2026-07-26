interface TopBarProps {
  title: string;
  screenId: string;
  ref_?: string;
  slug?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, screenId, ref_, slug, actions }: TopBarProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <h1 className="text-2xl font-bold text-[#1A1D1F] leading-tight">{title}</h1>
      <span className="text-[13px] font-semibold text-[#0B5C66] bg-[#DEF3F5] px-2.5 py-0.5 rounded">
        {screenId}
      </span>
      {ref_ && (
        <span className="text-[13px] text-[#7C8388]">Ref: {ref_}</span>
      )}
      {slug && (
        <span className="ml-auto text-[12px] text-[#7C8388] font-mono hidden xl:block">
          console.healthcoordination.in/{slug}
        </span>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
