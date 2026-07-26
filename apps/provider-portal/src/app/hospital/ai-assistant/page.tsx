'use client';

// P-09: AI Assistant — F2, §A4. Advisory only — never a clinical decision.

import { useState } from 'react';
import { CardPadded } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const INITIAL_MESSAGES = [
  { role: 'user', text: "What's my discharge forecast for tonight?" },
  { role: 'assistant', text: 'Based on historical patterns, expect 6–8 discharges between 6–10 PM, mostly General ward.' },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: 'user', text: input }]);
    setInput('');
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: 'This is an AI-generated advisory estimate. Please verify with your clinical team before making decisions.' },
      ]);
    }, 800);
  };

  return (
    <div>
      <h1 className="text-[20px] font-bold mb-4">AI Assistant</h1>
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
        <CardPadded>
          <p className="text-[13px] font-bold mb-2.5">Capacity forecast summary</p>
          <p className="text-[13px]" style={{ color: '#4A5054', lineHeight: 1.5 }}>
            ICU demand likely to rise ~18% over next 12h based on current admission velocity. Consider staffing review.
          </p>
          <Badge variant="warning" className="mt-3">Advisory only — never a clinical decision</Badge>
        </CardPadded>

        <CardPadded className="flex flex-col gap-2.5" style={{ minHeight: 300 }}>
          <div className="flex-1 space-y-2.5 overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] px-3.5 py-2.5 text-[13px] rounded-[10px] ${
                  m.role === 'user' ? 'ml-auto' : 'mr-auto'
                }`}
                style={{
                  background: m.role === 'user' ? '#DEF3F5' : '#F2F4F5',
                  borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                }}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask the AI Assistant…"
              className="flex-1 h-10 rounded-[8px] border px-3 text-[13px] outline-none"
              style={{ borderColor: '#C7CDD0' }}
            />
            <button
              onClick={send}
              className="h-10 px-4 rounded-[8px] text-[13px] font-bold text-white"
              style={{ background: '#0B5C66' }}
            >
              Send
            </button>
          </div>
        </CardPadded>
      </div>
    </div>
  );
}
