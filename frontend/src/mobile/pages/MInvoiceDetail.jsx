import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Send, Link2, Copy, Share2, MessageSquare, Wallet, FileDown, PenLine, Trash2, User } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { MHeader, MCard, Section, Loading, LoadError, Pill, MButton, KV, Chips } from '../components/MUi';
import { PaymentSheet } from '../components/PaymentSheet';
import { validPhone } from '../components/ContactActions';
import { useLoad, useAction } from '../components/useLoad';
import { openPdf } from './MQuoteDetail';
import { INVOICE_STATUS, PAYMENT_METHODS, money, shortDate } from '../constants';

const STATUS_OPTS = Object.entries(INVOICE_STATUS).map(([k, v]) => [k, v.label]);

const PayLink = ({ invoice, client }) => {
  const { busy, run } = useAction();
  const [url, setUrl] = useState(invoice.payment_link_token ? `${window.location.origin}/facture/payer/${invoice.payment_link_token}` : '');
  const generate = async () => {
    const r = await run('gen', () => adminApi.generatePaymentLink(invoice.id), 'Lien de paiement prêt');
    if (r) setUrl(r.data.url || `${window.location.origin}/facture/payer/${r.data.token}`);
  };
  const copy = async () => { await navigator.clipboard.writeText(url); toast.success('Lien copié'); };
  const share = () => navigator.share({ title: `Facture ${invoice.invoice_number}`, text: `Votre facture ${invoice.invoice_number} — ${money(invoice.balance_due)}`, url }).catch(() => {});
  const sms = `sms:${(client?.phone || '').replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(`Bonjour, voici le lien pour régler votre facture ${invoice.invoice_number} (${money(invoice.balance_due)}) : ${url}`)}`;

  if (!url) return <MButton variant="ghost" data-testid="m-invoice-paylink-generate" onClick={generate} loading={busy === 'gen'} className="w-full"><Link2 className="h-4 w-4" /> Générer le lien de paiement</MButton>;
  return (
    <MCard className="space-y-3" testId="m-invoice-paylink">
      <p className="text-xs text-slate-400">Lien de paiement (Stripe · Interac · Wise)</p>
      <p className="text-xs font-mono text-[#E9C85A] break-all" data-testid="m-invoice-paylink-url">{url}</p>
      <div className="grid grid-cols-3 gap-2">
        <MButton variant="ghost" data-testid="m-invoice-paylink-copy" onClick={copy} className="h-10 text-xs"><Copy className="h-4 w-4" /> Copier</MButton>
        <a href={validPhone(client?.phone) ? sms : undefined} data-testid="m-invoice-paylink-sms" className={`${validPhone(client?.phone) ? '' : 'pointer-events-none opacity-30 '}h-10 rounded-xl bg-white/5 border border-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95`}><MessageSquare className="h-4 w-4" /> Texto</a>
        {navigator.share
          ? <MButton variant="ghost" data-testid="m-invoice-paylink-share" onClick={share} className="h-10 text-xs"><Share2 className="h-4 w-4" /> Partager</MButton>
          : <a href={url} target="_blank" rel="noopener noreferrer" className="h-10 rounded-xl bg-white/5 border border-[#1E293B] text-white text-xs font-semibold flex items-center justify-center">Ouvrir</a>}
      </div>
    </MCard>
  );
};

export default function MInvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { busy, run } = useAction();
  const [paySheet, setPaySheet] = useState(false);
  const { data, setData, loading, reload, error } = useLoad(async () => {
    const inv = (await adminApi.getInvoice(id)).data;
    const c = (await adminApi.getClient(inv.client_id).catch(() => ({ data: null }))).data;
    return { inv, client: c };
  }, [id]);

  if (loading) return <Loading />;
  if (!data) return <LoadError error={error} onRetry={reload} />;
  const { inv, client } = data;

  const changeStatus = async (status) => {
    if (await run('status', () => adminApi.updateInvoice(id, { status }), 'Statut mis à jour')) setData({ ...data, inv: { ...inv, status } });
  };
  const send = async () => { if (await run('send', () => adminApi.sendInvoiceByEmail(id), 'Facture envoyée par courriel')) reload(); };
  const remove = async () => {
    if (!window.confirm('Supprimer cette facture ?')) return;
    if (await run('delete', () => adminApi.deleteInvoice(id), 'Facture supprimée')) navigate('/m/invoices', { replace: true });
  };

  return (
    <div data-testid="m-invoice-detail">
      <MHeader back title={inv.invoice_number} subtitle={`${client?.full_name || ''} · ${shortDate(inv.created_at)}`} action={<Pill map={INVOICE_STATUS} value={inv.status} testId="m-invoice-status" />} />

      <Section>
        <MCard className="bg-gradient-to-br from-[#D4AF37]/15 to-[#111827] border-[#D4AF37]/25">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#E9C85A] font-semibold">Solde à payer</p>
          <p className="font-heading text-4xl font-bold text-white mt-1" data-testid="m-invoice-balance">{money(inv.balance_due)}</p>
          <p className="text-xs text-slate-400 mt-2">Total {money(inv.total)} · payé {money(inv.amount_paid)} · échéance {shortDate(inv.due_date)}</p>
        </MCard>
      </Section>

      <Section title="Statut"><Chips options={STATUS_OPTS} value={inv.status} onChange={changeStatus} testPrefix="m-invoice-status" /></Section>

      <Section title="Encaisser">
        <div className="space-y-2">
          <PayLink invoice={inv} client={client} />
          {inv.balance_due > 0 && <MButton data-testid="m-invoice-record-payment" onClick={() => setPaySheet(true)} className="w-full"><Wallet className="h-4 w-4" /> Enregistrer un paiement</MButton>}
        </div>
      </Section>

      <Section title="Lignes">
        <MCard>
          {inv.lines.map((l) => (
            <div key={l.id} className="flex justify-between gap-3 py-2 border-b border-[#1E293B] last:border-0">
              <div><p className="text-sm text-white">{l.description}</p><p className="text-xs text-slate-500">{l.quantity} × {money(l.unit_price)}</p></div>
              <p className="text-sm font-semibold text-white whitespace-nowrap">{money(l.line_total)}</p>
            </div>
          ))}
          <div className="pt-2">
            <KV k="Sous-total" v={money(inv.subtotal)} />
            <KV k="TPS" v={money(inv.tps_amount)} />
            <KV k="TVQ" v={money(inv.tvq_amount)} />
            <KV k="Total" v={money(inv.total)} strong />
          </div>
        </MCard>
      </Section>

      {inv.payments?.length > 0 && (
        <Section title="Paiements reçus">
          <div className="space-y-2">
            {inv.payments.map((p, i) => (
              <MCard key={p.id || i} className="py-3 flex justify-between">
                <div><p className="text-sm text-white">{PAYMENT_METHODS[p.method] || p.method}</p><p className="text-xs text-slate-500">{shortDate(p.date || p.created_at)}</p></div>
                <p className="text-sm font-bold text-emerald-300">{money(p.amount)}</p>
              </MCard>
            ))}
          </div>
        </Section>
      )}

      <Section title="Actions">
        <div className="grid grid-cols-2 gap-2">
          <MButton data-testid="m-invoice-send" onClick={send} loading={busy === 'send'}><Send className="h-4 w-4" /> Courriel</MButton>
          <MButton variant="ghost" data-testid="m-invoice-pdf" onClick={() => run('pdf', () => openPdf(() => adminApi.getInvoicePdf(id)))} loading={busy === 'pdf'}><FileDown className="h-4 w-4" /> PDF</MButton>
          <MButton variant="ghost" data-testid="m-invoice-sign-link" onClick={() => run('sign', () => adminApi.sendInvoiceSignatureLink(id), 'Lien de signature envoyé')} loading={busy === 'sign'}><PenLine className="h-4 w-4" /> Signature</MButton>
          {client && <MButton variant="ghost" data-testid="m-invoice-client" onClick={() => navigate(`/m/clients/${client.id}`)}><User className="h-4 w-4" /> Client</MButton>}
          <MButton variant="danger" data-testid="m-invoice-delete" onClick={remove} loading={busy === 'delete'} className="col-span-2"><Trash2 className="h-4 w-4" /> Supprimer</MButton>
        </div>
      </Section>

      {paySheet && <PaymentSheet open invoice={inv} onOpenChange={setPaySheet} onSaved={reload} />}
    </div>
  );
}
