import { MobileShell } from '@/components/shell/MobileShell'
import { BottomNav } from '@/components/shell/BottomNav'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileShell>
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      <BottomNav />
    </MobileShell>
  )
}
