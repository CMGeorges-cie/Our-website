import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { MHeader, MCard, Loading, Empty, Pill, SearchBar, Chips } from '../components/MUi';
import { useLoad } from '../components/useLoad';
import { INVOICE_STATUS, money, shortDate } from '../constants';

const FILTERS = [['', 'Toutes'], ...Object.entries(INVOICE_STATUS).filter(([k]) => k !== 'cancelled').map(([k, v]) => [k, v.label])];

export default function MInvoices() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const { data, loading } = useLoad(async () => {
    const [i, c] = await Promise.all([adminApi.getInvoices(status ? { status } : {}), adminApi.getClients()]);
    const names = Object.fromEntries(c.data.map((x) => [x.id, x.full_name]));
    return i.data.map((x) => ({ ...x, client_name: names[x.client_id] || '—' }));
  }, [status]);

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return (data || []).filter((x) => !s || [x.invoice_number, x.client_name].some((v) => v?.toLowerCase().includes(s)));
  }, [data, q]);
  const due = list.reduce((s, x) => s + (x.status !== 'cancelled' ? x.balance_due || 0 : 0), 0);

  return (
    <div data-testid="m-invoices-page">
      <MHeader title="Factures" subtitle={data ? `${list.length} facture(s) · ${money(due)} à encaisser` : ''}
        action={<button data-testid="m-invoices-add" onClick={() => navigate('/m/invoices/new')} className="h-10 w-10 rounded-full bg-[#D4AF37] text-[#0B1120] flex items-center justify-center active:scale-95"><Plus className="h-5 w-5" /></button>} />
      <div className="px-5 space-y-3 mb-4">
        <SearchBar value={q} onChange={setQ} placeholder="N° facture ou client…" />
        <Chips options={FILTERS} value={status} onChange={setStatus} testPrefix="m-invoices-filter" />
      </div>
      <div className="px-5 space-y-2 m-stagger">
        {loading ? <Loading /> : list.length === 0 ? <Empty text="Aucune facture" /> : list.map((x) => (
          <MCard key={x.id} testId={`m-invoice-row-${x.id}`} onClick={() => navigate(`/m/invoices/${x.id}`)}>
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white truncate">{x.client_name}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{x.invoice_number} · {shortDate(x.created_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-heading font-bold text-white">{money(x.total)}</p>
                <div className="mt-1"><Pill map={INVOICE_STATUS} value={x.status} /></div>
              </div>
            </div>
            {x.balance_due > 0 && x.status !== 'draft' && <p className="text-[11px] text-amber-300 mt-2">Solde : {money(x.balance_due)} · échéance {shortDate(x.due_date)}</p>}
          </MCard>
        ))}
      </div>
    </div>
  );
}
