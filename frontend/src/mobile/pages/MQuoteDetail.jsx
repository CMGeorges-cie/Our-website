import { useNavigate, useParams } from 'react-router-dom';
import { Send, PenLine, FileDown, User } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { MHeader, MCard, Section, Loading, Pill, MButton, KV } from '../components/MUi';
import { useLoad, useAction } from '../components/useLoad';
import { QUOTE_STATUS, money, shortDate } from '../constants';

export const openPdf = async (fn) => {
  const r = await fn();
  const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
  if (!window.open(url, '_blank')) window.location.href = url;
};

export default function MQuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { busy, run } = useAction();
  const { data: q, loading, reload } = useLoad(async () => (await adminApi.getQuote(id)).data, [id]);

  if (loading || !q) return <Loading />;

  const send = async () => { if (await run('send', () => adminApi.sendQuoteByEmail(id), 'Soumission envoyée par courriel')) reload(); };
  const sign = () => run('sign', () => adminApi.sendQuoteSignatureLink(id), 'Lien de signature envoyé');
  const pdf = () => run('pdf', () => openPdf(() => adminApi.getQuotePdf(id)));

  return (
    <div data-testid="m-quote-detail">
      <MHeader back title={money(q.total_with_tax)} subtitle={`Soumission du ${shortDate(q.created_at)} · valide jusqu'au ${shortDate(q.valid_until)}`}
        action={<Pill map={QUOTE_STATUS} value={q.status} testId="m-quote-status" />} />

      <Section title="Lignes">
        <div className="space-y-2">
          {q.lines.map((l) => (
            <MCard key={l.id} className="py-3">
              <div className="flex justify-between gap-3">
                <p className="text-sm text-white">{l.description}</p>
                <p className="text-sm font-semibold text-white whitespace-nowrap">{money(l.line_total)}</p>
              </div>
              <p className="text-xs text-slate-500 mt-1">{l.quantity} × {money(l.unit_price)}</p>
            </MCard>
          ))}
        </div>
      </Section>

      <Section title="Totaux">
        <MCard>
          <KV k="Main-d'œuvre" v={money(q.subtotal_labor)} />
          <KV k="Matériel" v={money(q.subtotal_material)} />
          {q.delivery_fee > 0 && <KV k="Livraison" v={money(q.delivery_fee)} />}
          <KV k={`Contingence (${q.contingency_percent}%)`} v={money(q.contingency_amount)} />
          <KV k="TPS" v={money(q.tps_amount)} />
          <KV k="TVQ" v={money(q.tvq_amount)} />
          <div className="border-t border-[#1E293B] mt-2 pt-2"><KV k="Total" v={money(q.total_with_tax)} strong /></div>
          <KV k="Dépôt requis" v={money(q.deposit_amount)} />
        </MCard>
      </Section>

      {q.notes && <Section title="Notes"><MCard><p className="text-sm text-slate-300 whitespace-pre-wrap">{q.notes}</p></MCard></Section>}

      <Section>
        <div className="space-y-2">
          <MButton data-testid="m-quote-send" onClick={send} loading={busy === 'send'} className="w-full"><Send className="h-4 w-4" /> Envoyer par courriel</MButton>
          <div className="grid grid-cols-2 gap-2">
            <MButton variant="ghost" data-testid="m-quote-sign-link" onClick={sign} loading={busy === 'sign'}><PenLine className="h-4 w-4" /> Lien signature</MButton>
            <MButton variant="ghost" data-testid="m-quote-pdf" onClick={pdf} loading={busy === 'pdf'}><FileDown className="h-4 w-4" /> PDF</MButton>
          </div>
          <MButton variant="ghost" data-testid="m-quote-open-lead" onClick={() => navigate(`/m/leads/${q.lead_id}`)} className="w-full"><User className="h-4 w-4" /> Voir le lead</MButton>
        </div>
      </Section>
    </div>
  );
}
