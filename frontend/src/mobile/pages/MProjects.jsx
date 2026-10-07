import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, CalendarDays } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { MHeader, MCard, Loading, LoadError, Empty, Pill, SearchBar, Chips } from '../components/MUi';
import { ProjectForm } from '../components/ProjectForm';
import { useLoad } from '../components/useLoad';
import { PROJECT_STATUS, shortDate, progressOf } from '../constants';

const FILTERS = [['', 'Tous'], ...Object.entries(PROJECT_STATUS).map(([k, v]) => [k, v.label])];

export default function MProjects() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useLoad(async () => {
    const [p, c] = await Promise.all([adminApi.getProjects(status ? { status } : {}), adminApi.getClients()]);
    const names = Object.fromEntries(c.data.map((x) => [x.id, x.full_name]));
    return p.data.map((x) => ({ ...x, client_name: names[x.client_id] || '—' }));
  }, [status]);

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return (data || []).filter((p) => !s || [p.title, p.client_name].some((v) => v?.toLowerCase().includes(s)));
  }, [data, q]);

  return (
    <div data-testid="m-projects-page">
      <MHeader title="Projets" subtitle={data ? `${list.length} chantier(s)` : ''}
        action={<button data-testid="m-projects-add" onClick={() => setParams({ new: '1' })} className="h-10 w-10 rounded-full bg-[#D4AF37] text-[#0B1120] flex items-center justify-center active:scale-95"><Plus className="h-5 w-5" /></button>} />
      <div className="px-5 space-y-3 mb-4">
        <SearchBar value={q} onChange={setQ} placeholder="Titre ou client…" />
        <Chips options={FILTERS} value={status} onChange={setStatus} testPrefix="m-projects-filter" />
      </div>
      <div className="px-5 space-y-2.5 m-stagger">
        {loading ? <Loading /> : !data ? <LoadError error={error} onRetry={reload} /> : list.length === 0 ? <Empty text="Aucun projet" /> : list.map((p) => (
          <MCard key={p.id} testId={`m-project-row-${p.id}`} onClick={() => navigate(`/m/projects/${p.id}`)}>
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white truncate">{p.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{p.client_name}</p>
              </div>
              <Pill map={PROJECT_STATUS} value={p.status} />
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-[#D4AF37] rounded-full transition-[width] duration-500" style={{ width: `${progressOf(p)}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{shortDate(p.scheduled_date)}</span>
              <span>{progressOf(p)}%</span>
            </div>
          </MCard>
        ))}
      </div>
      {params.get('new') === '1' && (
        <ProjectForm open defaultClient={params.get('client')} onOpenChange={(o) => !o && setParams({}, { replace: true })} onSaved={(p) => navigate(`/m/projects/${p.id}`)} />
      )}
    </div>
  );
}
