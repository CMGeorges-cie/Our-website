import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, KeyRound, FilePlus2, HardHat, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { MHeader, MCard, Section, Loading, LoadError, Pill, MButton, KV, ListRow } from '../components/MUi';
import { ContactActions, fullAddress } from '../components/ContactActions';
import { ClientForm } from '../components/ClientForm';
import { useLoad, useAction } from '../components/useLoad';
import { CLIENT_STATUS, INVOICE_STATUS, PROJECT_STATUS, QUOTE_STATUS, money, shortDate } from '../constants';

export default function MClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { busy, run } = useAction();
  const [edit, setEdit] = useState(false);
  const { data, setData, loading, error, reload } = useLoad(async () => {
    const [c, q, i, p] = await Promise.all([
      adminApi.getClient(id), adminApi.getQuotes({ client_id: id }), adminApi.getInvoices({ client_id: id }), adminApi.getProjects({ client_id: id }),
    ]);
    return { client: c.data, quotes: q.data, invoices: i.data, projects: p.data };
  }, [id]);

  if (loading) return <Loading />;
  if (!data) return <LoadError error={error} onRetry={reload} />;
  const { client, quotes, invoices, projects } = data;

  const portal = () => run('portal', () => adminApi.createPortalAccess(id), 'Accès portail client envoyé');
  const remove = async () => {
    if (!window.confirm('Supprimer ce client ?')) return;
    if (await run('delete', () => adminApi.deleteClient(id), 'Client supprimé')) navigate('/m/clients', { replace: true });
  };
  const balance = invoices.reduce((s, x) => s + (x.balance_due || 0), 0);

  return (
    <div data-testid="m-client-detail">
      <MHeader back title={client.full_name} subtitle={client.company_name || client.email}
        action={<button data-testid="m-client-edit" onClick={() => setEdit(true)} className="h-10 w-10 rounded-full border border-[#1E293B] flex items-center justify-center active:bg-white/10"><Pencil className="h-4 w-4 text-[#D4AF37]" /></button>} />

      <Section><ContactActions phone={client.phone} email={client.email} address={fullAddress(client)} /></Section>

      <Section>
        <div className="grid grid-cols-2 gap-2.5">
          <MCard><p className="text-[11px] text-slate-400">Revenus totaux</p><p className="font-heading text-xl font-bold text-white mt-1">{money(client.total_revenue)}</p></MCard>
          <MCard><p className="text-[11px] text-slate-400">Solde dû</p><p className={`font-heading text-xl font-bold mt-1 ${balance > 0 ? 'text-amber-300' : 'text-emerald-300'}`} data-testid="m-client-balance">{money(balance)}</p></MCard>
        </div>
      </Section>

      <Section title="Coordonnées">
        <MCard>
          <KV k="Téléphone" v={client.phone} />
          <KV k="Courriel" v={<span className="break-all">{client.email}</span>} />
          <KV k="Adresse" v={fullAddress(client) || '—'} />
          <KV k="Statut" v={<Pill map={CLIENT_STATUS} value={client.status} />} />
          {client.notes && <p className="text-sm text-slate-300 mt-3 pt-3 border-t border-[#1E293B] whitespace-pre-wrap">{client.notes}</p>}
        </MCard>
      </Section>

      <Section title={`Projets (${projects.length})`}>
        <div className="space-y-2">
          {projects.map((p) => <ListRow key={p.id} testId={`m-client-project-${p.id}`} title={p.title} subtitle={shortDate(p.created_at)} right={<Pill map={PROJECT_STATUS} value={p.status} />} onClick={() => navigate(`/m/projects/${p.id}`)} />)}
        </div>
      </Section>

      <Section title={`Factures (${invoices.length})`}>
        <div className="space-y-2">
          {invoices.map((x) => <ListRow key={x.id} testId={`m-client-invoice-${x.id}`} title={`${x.invoice_number} — ${money(x.total)}`} subtitle={`Solde ${money(x.balance_due)}`} right={<Pill map={INVOICE_STATUS} value={x.status} />} onClick={() => navigate(`/m/invoices/${x.id}`)} />)}
        </div>
      </Section>

      {quotes.length > 0 && (
        <Section title={`Soumissions (${quotes.length})`}>
          <div className="space-y-2">
            {quotes.map((x) => <ListRow key={x.id} title={money(x.total_with_tax)} subtitle={shortDate(x.created_at)} right={<Pill map={QUOTE_STATUS} value={x.status} />} onClick={() => navigate(`/m/quotes/${x.id}`)} />)}
          </div>
        </Section>
      )}

      <Section title="Actions">
        <div className="grid grid-cols-2 gap-2">
          <MButton data-testid="m-client-new-invoice" onClick={() => navigate(`/m/invoices/new?client=${id}`)}><FilePlus2 className="h-4 w-4" /> Facture</MButton>
          <MButton variant="ghost" data-testid="m-client-new-project" onClick={() => navigate(`/m/projects?new=1&client=${id}`)}><HardHat className="h-4 w-4" /> Projet</MButton>
          <MButton variant="ghost" data-testid="m-client-portal" onClick={portal} loading={busy === 'portal'}><KeyRound className="h-4 w-4" /> Accès portail</MButton>
          <MButton variant="danger" data-testid="m-client-delete" onClick={remove} loading={busy === 'delete'}><Trash2 className="h-4 w-4" /> Supprimer</MButton>
        </div>
      </Section>

      {edit && <ClientForm open client={client} onOpenChange={setEdit} onSaved={(c) => setData({ ...data, client: c })} />}
    </div>
  );
}
