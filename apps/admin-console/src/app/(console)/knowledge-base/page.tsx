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
  const [formOpen, setFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Support playbooks');
  const [body, setBody] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.knowledgeBase.list();
      setArticles(res.data);
      setCategories(res.meta.categories ?? []);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) return;
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(
    () => (active === 'All' ? articles : articles.filter((a) => a.category === active)),
    [articles, active],
  );

  const selected = articles.find((a) => a.id === selectedId) ?? null;

  async function handleCreate() {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await adminApi.knowledgeBase.create({
        title: title.trim(),
        category: category.trim() || 'Support playbooks',
        body: body.trim(),
        note: 'Created from Admin Console',
      });
      setFormOpen(false);
      setTitle('');
      setBody('');
      await load();
      const id = (created as { data?: { id?: string } })?.data?.id;
      if (id) setSelectedId(id);
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
        actions={
          <Button size="sm" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Close form' : 'New article'}
          </Button>
        }
      />
      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }} role="alert">
          {error}
        </div>
      )}

      {formOpen && (
        <Card padding="md" className="mb-4">
          <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">New playbook article</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] text-[#7C8388] font-medium block mb-1" htmlFor="kb-title">Title</label>
              <input id="kb-title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-9 px-3 rounded-md border border-[#E7EBEC] text-[13px]" />
            </div>
            <div>
              <label className="text-[11px] text-[#7C8388] font-medium block mb-1" htmlFor="kb-cat">Category</label>
              <input id="kb-cat" value={category} onChange={(e) => setCategory(e.target.value)} list="kb-cats" className="w-full h-9 px-3 rounded-md border border-[#E7EBEC] text-[13px]" />
              <datalist id="kb-cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-[#7C8388] font-medium block mb-1" htmlFor="kb-body">Content</label>
              <textarea id="kb-body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="w-full px-3 py-2 rounded-md border border-[#E7EBEC] text-[13px]" placeholder="Operational guidance…" />
            </div>
          </div>
          <div className="mt-3">
            <Button size="sm" onClick={() => void handleCreate()} disabled={creating}>
              {creating ? 'Saving…' : 'Publish article'}
            </Button>
          </div>
        </Card>
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
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedId(a.id)}
              className="text-left"
            >
              <Card>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#7C8388] mb-1">{a.category}</div>
                <div className="text-[15px] font-bold text-[#1A1D1F] mb-1">{a.title}</div>
                <div className="text-[12px] text-[#4A5054] mb-2 line-clamp-2">{a.body || '—'}</div>
                <div className="flex justify-between text-[11px] text-[#7C8388]">
                  <span>Updated {new Date(a.updatedAt).toLocaleDateString()}</span>
                  <span>{a.note ?? ''}</span>
                </div>
              </Card>
            </button>
          ))}
          {selected && (
            <Card padding="md">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#7C8388] mb-1">{selected.category}</div>
              <div className="text-[18px] font-bold text-[#1A1D1F] mb-3">{selected.title}</div>
              <div className="text-[13px] text-[#4A5054] whitespace-pre-wrap">{selected.body}</div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
