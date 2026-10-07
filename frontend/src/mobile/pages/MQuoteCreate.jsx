import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi, aiApi } from '@/lib/api';
import { MHeader, Section, MButton, Field, inputCls, Loading } from '../components/MUi';
import { LinesEditor, cleanLines } from '../components/LinesEditor';
import { AiDraftBox } from '../components/AiDraftBox';
import { useLoad, useAction } from '../components/useLoad';

const TYPES = [['labor', 'Main-d\'œuvre'], ['material', 'Matériel'], ['delivery', 'Livraison'], ['other', 'Autre']];

export default function MQuoteCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { busy, run } = useAction();
  const [lines, setLines] = useState([{ description: '', quantity: 1, unit_price: '', line_type: 'labor' }]);
  const [contingency, setContingency] = useState(15);
  const [delivery, setDelivery] = useState(0);
  const [notes, setNotes] = useState('');
  const { data: lead, loading } = useLoad(async () => (await adminApi.getLead(id)).data, [id]);

  const draft = async (prompt) => {
    const d = (await aiApi.draftQuote({ lead_id: id, prompt })).data;
    setLines(d.lines.map((l) => ({ ...l, unit_price: String(l.unit_price) })));
    if (d.contingency_percent != null) setContingency(d.contingency_percent);
    if (d.notes) setNotes(d.notes);
  };

  const save = async () => {
    const clean = cleanLines(lines);
    if (!clean.length) return toast.error('Ajoutez au moins une ligne');
    const r = await run('save', () => adminApi.createQuote({
      lead_id: id, lines: clean, contingency_percent: parseFloat(contingency) || 0, delivery_fee: parseFloat(delivery) || 0, urgency_fee: 0, notes,
    }), 'Soumission créée');
    if (r) navigate(`/m/quotes/${r.data.id}`, { replace: true });
  };

  if (loading || !lead) return <Loading />;

  return (
    <div data-testid="m-quote-create">
      <MHeader back title="Nouvelle soumission" subtitle={lead.full_name} />
      <Section><AiDraftBox onDraft={draft} placeholder="Ex : peindre salon 20x15, 2 couches, plafond inclus…" /></Section>
      <Section title="Lignes"><LinesEditor lines={lines} setLines={setLines} types={TYPES} /></Section>
      <Section title="Options">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contingence %"><input data-testid="m-quote-contingency" className={inputCls} inputMode="decimal" value={contingency} onChange={(e) => setContingency(e.target.value)} /></Field>
          <Field label="Frais livraison $"><input data-testid="m-quote-delivery" className={inputCls} inputMode="decimal" value={delivery} onChange={(e) => setDelivery(e.target.value)} /></Field>
        </div>
        <Field label="Notes">
          <textarea data-testid="m-quote-notes" rows={3} className={`${inputCls} h-auto py-2 mt-0`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </Section>
      <Section><MButton data-testid="m-quote-save" onClick={save} loading={busy === 'save'} className="w-full">Créer la soumission</MButton></Section>
    </div>
  );
}
