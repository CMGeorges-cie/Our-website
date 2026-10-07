import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/lib/api';
import { MHeader, ListRow, Loading, LoadError, Empty, Pill, Chips } from '../components/MUi';
import { useLoad } from '../components/useLoad';
import { QUOTE_STATUS, money, shortDate } from '../constants';

const FILTERS = [['', 'Toutes'], ...Object.entries(QUOTE_STATUS).map(([k, v]) => [k, v.label])];

export default function MQuotes() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useLoad(async () => {
    const [q, l] = await Promise.all([adminApi.getQuotes(), adminApi.getLeads()]);
    const names = Object.fromEntries(l.data.map((x) => [x.id, x.full_name]));
    return q.data.map((x) => ({ ...x, lead_name: names[x.lead_id] || 'Lead' }));
  });
  const list = useMemo(() => (data || []).filter((q) => !status || q.status === status), [data, status]);

  return (
    <div data-testid="m-quotes-page">
      <MHeader back title="Soumissions" subtitle={data ? `${list.length} soumission(s)` : ''} />
      <div className="px-5 mb-4"><Chips options={FILTERS} value={status} onChange={setStatus} testPrefix="m-quotes-filter" /></div>
      <div className="px-5 space-y-2 m-stagger">
        {loading ? <Loading /> : !data ? <LoadError error={error} onRetry={reload} /> : list.length === 0 ? <Empty text="Aucune soumission" /> : list.map((q) => (
          <ListRow key={q.id} testId={`m-quote-row-${q.id}`} title={`${q.lead_name} — ${money(q.total_with_tax)}`} subtitle={shortDate(q.created_at)}
            right={<Pill map={QUOTE_STATUS} value={q.status} />} onClick={() => navigate(`/m/quotes/${q.id}`)} />
        ))}
      </div>
    </div>
  );
}
