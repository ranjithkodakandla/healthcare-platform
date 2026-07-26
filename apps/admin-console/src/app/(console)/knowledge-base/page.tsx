'use client';

// A-11: Knowledge Base — G8.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { adminApi, type KnowledgeArticle, ApiError } from '@/lib/api';

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [active, setActive] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.knowledgeBase.list();
      setArticles(res.data);
      setCategories(res.meta.categories ?? []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.isUnauthorized
        ? 'Sign in required (Firebase admin session)'
        : err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(
    () => (active === 'All' ? articles : articles.filter((a) => a.category === active)),
    [articles, active],
  );

  async function handleNew() {
    setCreating(true);
    try {
      await adminApi.knowledgeBase.create({
        title: 'New playbook article',
        category: categories[0] ?? 'Support playbooks',
        body: 'Draft content — replace with operational guidance.',
        note: 'Created from Admin Console',
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  const sidebar = ['All', ...categories];

  return (
    <>
      <TopBar
        title="Knowledge Base"
        screenId="A-11"
        ref_="G8"
        slug="knowledge-base"
        actions={<Button size="sm" onClick={() => void handleNew()} disabled={creating}>{creating ? 'Creating…' : 'New article'}</Button>}
      />
      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}
      <div className="flex gap-4">
        <aside className="w-52 shrink-0">
          <Card padding="sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#7C8388] mb-2">Categories</div>
            <div className="flex flex-col gap-1">
              {sidebar.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActive(c)}
                  className="text-left text-[12px] font-semibold px-2 py-1.5 rounded-md"
                  style={{ background: active === c ? '#DEF3F5' : 'transparent', color: active === c ? '#0B5C66' : '#4A5054' }}
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>
        </aside>
        <div className="flex-1 flex flex-col gap-3">
          {loading && <p className="text-[13px] text-[#7C8388]">Loading…</p>}
          {!loading && filtered.length === 0 && <p className="text-[13px] text-[#7C8388]">No articles</p>}
          {filtered.map((a) => (
            <Card key={a.id}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#7C8388] mb-1">{a.category}</div>
              <div className="text-[15px] font-bold text-[#1A1D1F] mb-1">{a.title}</div>
              <div className="text-[12px] text-[#4A5054] mb-2 line-clamp-2">{a.body || '—'}</div>
              <div className="flex justify-between text-[11px] text-[#7C8388]">
                <span>Updated {new Date(a.updatedAt).toLocaleDateString()}</span>
                <span>{a.note ?? ''}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
