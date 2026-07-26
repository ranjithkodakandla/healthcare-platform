'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

// Minimal modal primitive — none existed in components/ui/ before (UAT Finding #3:
// "+ Add user" had no dialog to open at all). Keep this generic so other portal
// screens can reuse it rather than each building its own.
export function Dialog({ open, title, onClose, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(26,29,31,0.45)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-[440px] bg-white rounded-[12px] p-6"
        style={{ boxShadow: '0 12px 32px rgba(26,29,31,0.2)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold" style={{ color: '#1A1D1F' }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-[8px] flex items-center justify-center hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
