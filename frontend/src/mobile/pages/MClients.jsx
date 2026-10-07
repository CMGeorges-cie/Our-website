import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { MHeader, ListRow, Loading, Empty, Pill, SearchBar } from '../components/MUi';
import { ClientForm } from '../components/ClientForm';
import { useLoad } from '../components/useLoad';
import { CLIENT_STATUS, money } from '../constants';

export default function MClients() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const { data, loading } = useLoad(async () => (await adminApi.getClients()).data);
  const formOpen = params.get('new') === '1';

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return (data || []).filter((c) => !s || [c.full_name, c.email, c.phone, c.city, c.company_name].some((v) => v?.toLowerCase().includes(s)));
  }, [data, q]);

  return (
    <div data-testid="m-clients-page">
      <MHeader back title="Clients" subtitle={data ? `${list.length} client(s)` : ''}
        action={
          <button data-testid="m-clients-add" onClick={() => setParams({ new: '1' })} className="h-10 w-10 rounded-full bg-[#D4AF37] text-[#0B1120] flex items-center justify-center active:scale-95">
            <Plus className="h-5 w-5" />
          </button>
        } />
      <div className="px-5 mb-4"><SearchBar value={q} onChange={setQ} placeholder="Nom, téléphone, ville…" /></div>
      <div className="px-5 space-y-2 m-stagger">
        {loading ? <Loading /> : list.length === 0 ? <Empty text="Aucun client" /> : list.map((c) => (
          <ListRow key={c.id} testId={`m-client-row-${c.id}`} title={c.full_name} subtitle={`${c.phone} · ${c.city || '—'} · ${money(c.total_revenue)}`}
            right={<Pill map={CLIENT_STATUS} value={c.status} />} onClick={() => navigate(`/m/clients/${c.id}`)} />
        ))}
      </div>
      {formOpen && (
        <ClientForm open onOpenChange={(o) => !o && setParams({})} onSaved={(c) => navigate(`/m/clients/${c.id}`, { replace: true })} />
      )}
    </div>
  );
}
