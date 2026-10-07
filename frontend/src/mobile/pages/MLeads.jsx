import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/lib/api';
import { MHeader, ListRow, Loading, LoadError, Empty, Pill, SearchBar, Chips } from '../components/MUi';
import { useLoad } from '../components/useLoad';
import { LEAD_STATUS, SERVICE_TYPES, shortDate } from '../constants';

const FILTERS = [['', 'Tous'], ...Object.entries(LEAD_STATUS).map(([k, v]) => [k, v.label])];

export default function MLeads() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useLoad(async () => (await adminApi.getLeads(status ? { status } : {})).data, [status]);

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return (data || []).filter((l) => !s || [l.full_name, l.email, l.phone, l.city].some((v) => v?.toLowerCase().includes(s)));
  }, [data, q]);

  return (
    <div data-testid="m-leads-page">
      <MHeader title="Leads" subtitle={data ? `${list.length} demande(s)` : ''} />
      <div className="px-5 space-y-3 mb-4">
        <SearchBar value={q} onChange={setQ} placeholder="Nom, courriel, téléphone…" />
        <Chips options={FILTERS} value={status} onChange={setStatus} testPrefix="m-leads-filter" />
      </div>
      <div className="px-5 space-y-2 m-stagger">
        {loading ? <Loading /> : !data ? <LoadError error={error} onRetry={reload} /> : list.length === 0 ? <Empty text="Aucun lead" /> : list.map((l) => (
          <ListRow key={l.id} testId={`m-lead-row-${l.id}`} title={l.full_name}
            subtitle={`${SERVICE_TYPES[l.service_type] || l.service_type} · ${l.city || '—'} · ${shortDate(l.created_at)}`}
            right={<Pill map={LEAD_STATUS} value={l.status} />} onClick={() => navigate(`/m/leads/${l.id}`)} />
        ))}
      </div>
    </div>
  );
}
