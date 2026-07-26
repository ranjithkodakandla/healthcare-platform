import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Status badge configs used across all ResourceCard types
export const STATUS_STYLES = {
  available: { color: '#0E6B3A', bg: '#DFF5E9' },
  low: { color: '#8A5A00', bg: '#FBF0D9' },
  full: { color: '#8C1D1D', bg: '#FBE3E3' },
  pending: { color: '#8A5A00', bg: '#FBF0D9' },
  confirmed: { color: '#0E6B3A', bg: '#DFF5E9' },
  done: { color: '#0E6B3A', bg: '#DFF5E9' },
  stale: { color: '#7A8884', bg: '#EAE5DC' },
} as const

export type StatusKey = keyof typeof STATUS_STYLES

export function severityColor(s: string) {
  if (s === 'CRITICAL') return '#8C1D1D'
  if (s === 'URGENT') return '#D98C0E'
  if (s === 'MODERATE') return '#0F766E'
  return '#5B6B68'
}

export function severityBg(s: string) {
  if (s === 'CRITICAL') return 'rgba(179,38,30,0.25)'
  if (s === 'URGENT') return '#FBF0D9'
  return '#E9F3F0'
}
