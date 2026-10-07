import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi, aiApi } from '@/lib/api';
import { MHeader, Section, MButton, Field, inputCls, KV, MCard } from '../components/MUi';
import { LinesEditor, cleanLines, lineTotal } from '../components/LinesEditor';
import { AiDraftBox } from '../components/AiDraftBox';
import { useLoad, useAction } from '../components/useLoad';
import { money } from '../constants';

const TYPES = [['service', 'Service'], ['material', 'Matériel'], ['delivery', 'Livraison'], ['other', 'Autre']];
const TERMS = ['À réception', 'Net 7', 'Net 15', 'Net 30'];

export default function MInvoiceCreate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { busy, run } = useAction();
  const [clientId, setClientId] = useState(params.get('client') || '');
  const [lines, setLines] = useState([{ description: '', quantity: 1, unit_price: '', line_type: 'service' }]);
  const [terms, setTerms] = useState('Net 30');
  const [due, setDue] = useState('');
  const [notes, setNotes] = useState('');
  const { data: clients } = useLoad(async () => (await adminApi.getClients()).data);
  const sub = lineTotal(lines);

  const draft = async (prompt) => {
    if (!clientId) throw Object.assign(new Error('no client'), { response: { data: { detail: 'Choisissez d\'abord un client' } } });
    const d = (await aiApi.draftInvoice({ client_id: clientId, project_id: params.get('project') || undefined, prompt })).data;
    setLines(d.lines.map((l) => ({ ...l, unit_price: String(l.unit_price) })));
    if (d.notes) setNotes(d.notes);
    if (d.payment_terms) setTerms(d.payment_terms);
  };

  const save = async () => {
    const clean = cleanLines(lines);
    if (!clientId) return toast.error('Choisissez un client');
    if (!clean.length) return toast.error('Ajoutez au moins une ligne');
    const r = await run('save', () => adminApi.createInvoice({
      client_id: clientId, project_id: params.get('project') || null, lines: clean, notes, payment_terms: terms,
      due_date: due ? new Date(due).toISOString() : null,
    }), 'Facture créée');
    if (r) navigate(`/m/invoices/${r.data.id}`, { replace: true });
  };

  return (
    <div data-testid="m-invoice-create">
      <MHeader back title="Nouvelle facture" />
      <Section>
        <Field label="Client *">
          <select data-testid="m-invoice-client" className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Choisir un client…</option>
            {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </Field>
      </Section>
      <Section><AiDraftBox onDraft={draft} placeholder="Ex : installation TV 65 pouces + support mural + 2h main-d'œuvre…" /></Section>
      <Section title="Lignes"><LinesEditor lines={lines} setLines={setLines} types={TYPES} /></Section>
      <Section title="Conditions">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Modalités">
            <select data-testid="m-invoice-terms" className={inputCls} value={terms} onChange={(e) => setTerms(e.target.value)}>
              {[...new Set([terms, ...TERMS])].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Échéance"><input data-testid="m-invoice-due" type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <Field label="Notes"><textarea data-testid="m-invoice-notes" rows={3} className={`${inputCls} h-auto py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </Section>
      <Section>
        <MCard>
          <KV k="Sous-total" v={money(sub)} />
          <KV k="TPS (5%)" v={money(sub * 0.05)} />
          <KV k="TVQ (9,975%)" v={money(sub * 0.09975)} />
          <div className="border-t border-[#1E293B] mt-2 pt-2"><KV k="Total estimé" v={money(sub * 1.14975)} strong /></div>
        </MCard>
      </Section>
      <Section><MButton data-testid="m-invoice-save" onClick={save} loading={busy === 'save'} className="w-full">Créer la facture</MButton></Section>
    </div>
  );
}
