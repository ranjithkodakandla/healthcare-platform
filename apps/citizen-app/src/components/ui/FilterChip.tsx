'use client'

interface FilterChipProps {
  label: string
  active?: boolean
  onClick?: () => void
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 min-h-11 rounded-pill text-sm font-semibold whitespace-nowrap flex-shrink-0"
      style={{
        background: active ? '#0F766E' : 'transparent',
        color: active ? '#fff' : '#1B2422',
        border: active ? 'none' : '1px solid #D8D3C8',
      }}
    >
      {label}
    </button>
  )
}
