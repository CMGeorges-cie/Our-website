import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, UserCheck, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { MHeader, MCard, Section, Loading, Pill, MButton, KV, Chips, ListRow } from '../components/MUi';
import { ContactActions, fullAddress } from '../components/ContactActions';
import { useLoad, useAction } from '../components/useLoad';
import { LEAD_STATUS, QUOTE_STATUS, SERVICE_TYPES, money, shortDate } from '../constants';

const STATUS_OPTS = Object.entries(LEAD_STATUS).map(([k, v]) => [k, v.label]);

export default function MLeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { busy, run } = useAction();
  const [notes, setNotes] = useState(null);
  const { data, setData, loading } = useLoad(async () => {
    const [l, q] = await Promise.all([adminApi.getLead(id), adminApi.getQuotes({ lead_id: id })]);
    return { lead: l.data, quotes: q.data };
  }, [id]);

  if (loading || !data) return <Loading />;
  const { lead, quotes } = data;
  const setLead = (patch) => setData({ ...data, lead: { ...lead, ...patch } });

  const changeStatus = async (status) => {
    if (await run('status', () => adminApi.updateLead(id, { status }), 'Statut mis à jour')) setLead({ status });
  };
  const saveNotes = async () => {
    if (await run('notes', () => adminApi.updateLead(id, { notes }), 'Notes enregistrées')) { setLead({ notes }); setNotes(null); }
  };
  const convert = async () => {
    const r = await run('convert', () => adminApi.convertLeadToClient(id), 'Lead converti en client');
    if (r) navigate(`/m/clients/${r.data.id}`);
  };
  const remove = async () => {
    if (!window.confirm('Supprimer ce lead ?')) return;
    if (await run('delete', () => adminApi.deleteLead(id), 'Lead supprimé')) navigate('/m/leads', { replace: true });
  };

  return (
    <div data-testid="m-lead-detail">
      <MHeader back title={lead.full_name} subtitle={`${SERVICE_TYPES[lead.service_type] || lead.service_type} · reçu le ${shortDate(lead.created_at)}`}
        action={<Pill map={LEAD_STATUS} value={lead.status} testId="m-lead-status-pill" />} />

      <Section><ContactActions phone={lead.phone} email={lead.email} address={fullAddress(lead)} /></Section>

      <Section title="Statut">
        <Chips options={STATUS_OPTS} value={lead.status} onChange={changeStatus} testPrefix="m-lead-status" />
      </Section>

      <Section title="Détails">
        <MCard>
          <KV k="Téléphone" v={lead.phone} />
          <KV k="Courriel" v={<span className="break-all">{lead.email}</span>} />
          <KV k="Adresse" v={fullAddress(lead) || '—'} />
          <KV k="Urgence" v={lead.urgency_level === 'urgent' ? 'Urgent' : 'Normal'} />
          <KV k="Date souhaitée" v={lead.preferred_date || '—'} />
          {lead.description && <p className="text-sm text-slate-300 mt-3 pt-3 border-t border-[#1E293B] whitespace-pre-wrap" data-testid="m-lead-description">{lead.description}</p>}
        </MCard>
      </Section>

      {lead.photos?.length > 0 && (
        <Section title={`Photos (${lead.photos.length})`}>
          <div className="grid grid-cols-3 gap-2">
            {lead.photos.map((p, i) => (
              <a key={i} href={p} target="_blank" rel="noopener noreferrer"><img src={p} alt="" className="aspect-square w-full rounded-xl object-cover" /></a>
            ))}
          </div>
        </Section>
      )}

      <Section title="Notes internes">
        <textarea data-testid="m-lead-notes" rows={3} value={notes ?? lead.notes ?? ''} onChange={(e) => setNotes(e.target.value)} placeholder="Ajouter une note…"
          className="w-full rounded-xl bg-[#111827] border border-[#1E293B] p-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]/60" />
        {notes !== null && <MButton data-testid="m-lead-notes-save" onClick={saveNotes} loading={busy === 'notes'} className="w-full mt-2">Enregistrer les notes</MButton>}
      </Section>

      <Section title={`Soumissions (${quotes.length})`}>
        <div className="space-y-2">
          {quotes.map((q) => (
            <ListRow key={q.id} testId={`m-lead-quote-${q.id}`} title={money(q.total_with_tax)} subtitle={shortDate(q.created_at)}
              right={<Pill map={QUOTE_STATUS} value={q.status} />} onClick={() => navigate(`/m/quotes/${q.id}`)} />
          ))}
          <MButton data-testid="m-lead-create-quote" onClick={() => navigate(`/m/leads/${id}/quote`)} className="w-full">
            <FileText className="h-4 w-4" /> Créer une soumission (IA)
          </MButton>
        </div>
      </Section>

      <Section>
        <div className="grid grid-cols-2 gap-2">
          <MButton variant="ghost" data-testid="m-lead-convert" onClick={convert} loading={busy === 'convert'}>
            <UserCheck className="h-4 w-4" /> {lead.client_id ? 'Voir le client' : 'Convertir client'}
          </MButton>
          <MButton variant="danger" data-testid="m-lead-delete" onClick={remove} loading={busy === 'delete'}>
            <Trash2 className="h-4 w-4" /> Supprimer
          </MButton>
        </div>
      </Section>
    </div>
  );
}
