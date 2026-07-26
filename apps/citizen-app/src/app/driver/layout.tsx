import { MobileShell } from '@/components/shell/MobileShell'

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileShell>
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </MobileShell>
  )
}
