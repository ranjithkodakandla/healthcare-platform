'use client';

// A-16: Communication Center — G13.
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { adminApi, type Broadcast, ApiError } from '@/lib/api';

const AUDIENCES = ['All hospitals (KA)', 'Hospital ER coordinators', 'Ambulance operators', 'Support Agents'];
const CHANNELS = ['IN_APP', 'WHATSAPP', 'SMS'] as const;

export default function CommunicationsPage() {
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [channels, setChannels] = useState<string[]>(['IN_APP']);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.communications.list();
      setHistory(res.data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.isUnauthorized
        ? 'Sign in required (Firebase admin session)'
        : err instanceof Error ? err.message : 'Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggleChannel(ch: string) {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  }

  async function submit(status: 'DRAFT' | 'SENT') {
    if (!title.trim() || !body.trim() || channels.length === 0) {
      setError('Title, body, and at least one channel are required');
      setSuccess(null);
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await adminApi.communications.create({ title, body, audience, channels, status });
      setTitle('');
      setBody('');
      await load();
      setSuccess(
        status === 'SENT'
          ? 'Broadcast recorded. Outbound WhatsApp/SMS fan-out remains stubbed (M14) — check Recent broadcasts below.'
          : 'Draft saved. It appears in Recent broadcasts.',
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit('SENT');
  }

  return (
    <>
      <TopBar title="Communication Center" screenId="A-16" ref_="G13" slug="communications" />
      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }} role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#DEF3F5', color: '#0B5C66' }} role="status">
          {success}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <form onSubmit={onSubmit}>
            <div className="text-[12px] font-bold uppercase tracking-wider text-[#7C8388] mb-2">Compose</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {AUDIENCES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAudience(a)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                  style={{
                    borderColor: audience === a ? '#0B5C66' : '#E7EBEC',
                    background: audience === a ? '#DEF3F5' : '#fff',
                    color: audience === a ? '#0B5C66' : '#4A5054',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mb-3">
              {CHANNELS.map((ch) => (
                <label key={ch} className="text-[12px] font-semibold flex items-center gap-1.5">
                  <input type="checkbox" checked={channels.includes(ch)} onChange={() => toggleChannel(ch)} />
                  {ch.replace('_', '-')}
                </label>
              ))}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Broadcast title"
              className="w-full h-10 border border-[#C7CDD0] rounded-md px-3 text-[13px] mb-2 outline-none"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message"
              rows={5}
              className="w-full border border-[#C7CDD0] rounded-md px-3 py-2 text-[13px] mb-3 outline-none"
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>Send</Button>
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void submit('DRAFT')}>
                Save draft
              </Button>
            </div>
            <p className="text-[11px] text-[#7C8388] mt-2">Outbound WhatsApp/SMS fan-out remains stubbed (M14) until credentials are provisioned.</p>
          </form>
        </Card>
        <Card padding="none">
          <div className="px-4 py-3 border-b border-[#E7EBEC] text-[12px] font-bold uppercase tracking-wider text-[#7C8388]">
            Recent broadcasts
          </div>
          {loading && <p className="px-4 py-4 text-[13px] text-[#7C8388]">Loading…</p>}
          <ul>
            {history.map((b) => (
              <li key={b.id} className="px-4 py-3 border-b border-[#E7EBEC]">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-bold">{b.title}</div>
                  <Badge variant={b.status === 'SENT' ? 'success' : 'neutral'}>{b.status}</Badge>
                </div>
                <div className="text-[12px] text-[#7C8388] mt-1">
                  {b.audience} · {new Date(b.createdAt).toLocaleString()} · {b.channels.join(', ')}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
