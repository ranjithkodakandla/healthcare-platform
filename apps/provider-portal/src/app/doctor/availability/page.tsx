'use client';

// P-13: Doctor Availability Toggle — FR-DOCP-001

import { useState } from 'react';
import { CardPadded } from '@/components/ui/Card';

const STATUS_OPTIONS = [
  { id: 'available', label: 'Available', color: '#0B5C66', bg: '#DEF3F5', border: '#0B5C66' },
  { id: 'busy', label: 'In Consultation', color: '#8A5A00', bg: '#FBF0D9', border: '#D98C0E' },
  { id: 'unavailable', label: 'Unavailable', color: '#C62E2E', bg: '#FDEAEA', border: '#C62E2E' },
  { id: 'emergency', label: 'Emergency Only', color: '#4A5054', bg: '#F2F4F5', border: '#C7CDD0' },
];

const SLOTS = ['8:00', '9:00', '10:00', '11:00', '12:00', '1:00', '2:00', '3:00', '4:00', '5:00', '6:00', '7:00'];
const SLOT_STATE: Record<string, string> = { '10:00': 'booked', '11:00': 'booked', '2:00': 'booked', '4:00': 'blocked' };

function slotStyle(slot: string) {
  if (SLOT_STATE[slot] === 'booked') return { background: '#FBF0D9', color: '#8A5A00' };
  if (SLOT_STATE[slot] === 'blocked') return { background: '#FDEAEA', color: '#C62E2E' };
  return { background: '#E6F5ED', color: '#1E9E5C' };
}

export default function DoctorAvailabilityPage() {
  const [status, setStatus] = useState('available');

  return (
    <div>
      <h1 className="text-[20px] font-bold mb-4">Availability</h1>
      <CardPadded className="max-w-[640px] mb-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.03em] mb-2.5" style={{ color: '#7C8388' }}>Real-time status</p>
        <div className="grid grid-cols-4 gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              className="h-[52px] rounded-[8px] text-[12px] font-bold text-center cursor-pointer transition-opacity"
              style={{
                border: `1.5px solid ${status === s.id ? s.border : '#E7EBEC'}`,
                background: status === s.id ? s.bg : '#FFFFFF',
                color: status === s.id ? s.color : '#7C8388',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </CardPadded>

      <p className="text-[13px] font-bold mb-2.5">Today&apos;s calendar slots</p>
      <div className="grid grid-cols-6 gap-2 max-w-[760px]">
        {SLOTS.map((slot) => (
          <div
            key={slot}
            className="h-11 rounded-[8px] flex items-center justify-center text-[11px] font-semibold"
            style={slotStyle(slot)}
          >
            {slot}
          </div>
        ))}
      </div>
    </div>
  );
}
