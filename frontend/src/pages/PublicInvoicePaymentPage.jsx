import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { BRAND } from '@/config/brand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard, Building2, ShieldCheck, CheckCircle2, XCircle, Loader2,
  Copy, Mail, Info, Landmark, ArrowRight,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/v1`;

const formatCAD = (v) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v || 0);

const StatusPill = ({ status }) => {
  const map = {
    paid: { label: 'Payée', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    partial: { label: 'Partiellement payée', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    sent: { label: 'À régler', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    overdue: { label: 'En retard', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
    draft: { label: 'Brouillon', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  };
  const s = map[status] || map.sent;
  return (
    <Badge variant="outline" className={`${s.cls} font-medium`} data-testid="invoice-status">
      {s.label}
    </Badge>
  );
};

export default function PublicInvoicePaymentPage() {
  const { token } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const sessionId = searchParams.get('session_id');
  const cancelled = searchParams.get('cancelled');

  const fetchInvoice = async () => {
    try {
      const res = await axios.get(`${API}/public/invoice/${token}`);
      setData(res.data);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.detail || 'Lien de paiement invalide ou expiré.'
      );
    } finally { setLoading(false); }
  };

  // Poll payment status if returning from Stripe
  useEffect(() => {
    fetchInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Set page title once invoice is loaded (bypass Helmet — buggy with dynamic children)
  useEffect(() => {
    if (data?.invoice) {
      document.title = `Facture ${data.invoice.invoice_number || ''} — ${data.company.name}`;
    }
  }, [data]);

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await axios.get(
          `${API}/public/invoice/${token}/status/${sessionId}`
        );
        if (res.data.payment_status === 'paid') {
          if (alive) {
            toast.success('Paiement reçu — merci !');
            setSearchParams({}, { replace: true });
            await fetchInvoice();
          }
          return;
        }
        if (res.data.status === 'expired') {
          if (alive) toast.error('Session expirée.');
          return;
        }
        setTimeout(poll, 2500);
      } catch (e) {
        console.error(e);
      }
    };
    poll();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token]);

  const handleStripeCheckout = async () => {
    setProcessing(true);
    try {
      const res = await axios.post(
        `${API}/public/invoice/${token}/stripe-checkout`,
        { origin_url: window.location.origin }
      );
      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Impossible d\'ouvrir Stripe.');
      setProcessing(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié dans le presse-papier`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-400" />
              <CardTitle className="text-slate-100">Lien introuvable</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 mb-4">{errorMsg}</p>
            <a href={`mailto:${BRAND.email}`} className="text-amber-500 hover:underline text-sm">
              Contacter {BRAND.name} : {BRAND.email}
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invoice, client, company } = data;
  const isPaid = invoice.status === 'paid' || invoice.balance_due <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <h1 className="text-3xl font-bold text-slate-100">{company.name}</h1>
          <p className="text-sm text-slate-400">{company.address} · {company.phone}</p>
        </div>

        {/* Cancelled banner */}
        {cancelled && !isPaid && (
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Info className="h-5 w-5 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-200">Paiement annulé. Vous pouvez réessayer ci-dessous.</p>
            </CardContent>
          </Card>
        )}

        {/* Paid banner */}
        {isPaid && (
          <Card className="bg-emerald-500/10 border-emerald-500/30" data-testid="invoice-paid-banner">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-100 font-medium">Cette facture est réglée.</p>
                <p className="text-sm text-emerald-300/80">Merci de votre confiance.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice card */}
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
          <CardHeader className="border-b border-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Facture</p>
                <CardTitle className="text-2xl text-slate-100" data-testid="invoice-number">
                  {invoice.invoice_number || `#${invoice.id.slice(0, 8)}`}
                </CardTitle>
              </div>
              <StatusPill status={isPaid ? 'paid' : invoice.status} />
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Client + dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-1">Facturé à</p>
                <p className="text-slate-100 font-medium">{client.full_name}</p>
                <p className="text-slate-400">{client.email}</p>
                {client.phone && <p className="text-slate-400">{client.phone}</p>}
              </div>
              <div className="sm:text-right">
                {invoice.due_date && (
                  <>
                    <p className="text-slate-500 mb-1">Échéance</p>
                    <p className="text-slate-100 font-medium">
                      {new Date(invoice.due_date).toLocaleDateString('fr-CA')}
                    </p>
                  </>
                )}
              </div>
            </div>

            <Separator className="bg-slate-800" />

            {/* Lines */}
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Détails</p>
              <div className="space-y-2">
                {invoice.lines.map((line, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4 py-2 border-b border-slate-800/60 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-100">{line.description}</p>
                      <p className="text-xs text-slate-500">
                        {line.quantity} × {formatCAD(line.unit_price)}
                      </p>
                    </div>
                    <p className="text-slate-100 font-medium tabular-nums">{formatCAD(line.line_total)}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-slate-800" />

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Sous-total</span>
                <span className="tabular-nums">{formatCAD(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>TPS (5%)</span>
                <span className="tabular-nums">{formatCAD(invoice.tps_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>TVQ (9.975%)</span>
                <span className="tabular-nums">{formatCAD(invoice.tvq_amount)}</span>
              </div>
              <Separator className="bg-slate-800 my-2" />
              <div className="flex justify-between font-semibold text-slate-100">
                <span>Total</span>
                <span className="tabular-nums text-lg">{formatCAD(invoice.total)}</span>
              </div>
              {invoice.amount_paid > 0 && (
                <>
                  <div className="flex justify-between text-emerald-400">
                    <span>Montant reçu</span>
                    <span className="tabular-nums">-{formatCAD(invoice.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-400 text-lg pt-1">
                    <span>Solde dû</span>
                    <span className="tabular-nums">{formatCAD(invoice.balance_due)}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment methods */}
        {!isPaid && (
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-slate-100 text-lg">Régler cette facture</CardTitle>
              <p className="text-sm text-slate-400">Choisissez votre méthode préférée. Paiement sécurisé.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Stripe */}
              <button
                onClick={handleStripeCheckout}
                disabled={processing}
                data-testid="pay-stripe-btn"
                className="w-full group flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/5 hover:from-amber-500/20 hover:border-amber-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-amber-500/20">
                    <CreditCard className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-100">Carte de crédit / débit</p>
                    <p className="text-xs text-slate-400">Visa · Mastercard · Apple Pay · Google Pay</p>
                  </div>
                </div>
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                ) : (
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                )}
              </button>

              {/* Interac */}
              <details className="group rounded-xl border border-slate-800 bg-slate-950/50">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-red-500/15">
                      <Building2 className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-100">Virement Interac</p>
                      <p className="text-xs text-slate-400">Aucun frais · Traité manuellement</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 group-open:hidden">Voir instructions</span>
                </summary>
                <div className="px-4 pb-4 pt-2 space-y-3 text-sm text-slate-300">
                  <p>Envoyez le montant à l'adresse ci-dessous depuis votre application bancaire :</p>
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <code className="text-amber-400 font-mono text-sm truncate">{company.email}</code>
                    <button
                      onClick={() => copyToClipboard(company.email, 'Courriel')}
                      data-testid="copy-interac-email"
                      className="text-slate-400 hover:text-amber-400 transition-colors shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Message / réponse : indiquez le numéro de facture <strong className="text-slate-300">{invoice.invoice_number}</strong>
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    Votre facture sera marquée comme payée dans les 24 heures suivant la réception du transfert.
                  </p>
                </div>
              </details>

              {/* Wise */}
              <details className="group rounded-xl border border-slate-800 bg-slate-950/50">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-emerald-500/15">
                      <Landmark className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-100">Wise (transfert international)</p>
                      <p className="text-xs text-slate-400">Pour paiements depuis l'étranger</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 group-open:hidden">Voir instructions</span>
                </summary>
                <div className="px-4 pb-4 pt-2 space-y-3 text-sm text-slate-300">
                  <p>Envoyez un email à {company.email} en indiquant le numéro de facture <strong className="text-slate-100">{invoice.invoice_number}</strong>. Nous vous transmettrons les coordonnées Wise et une confirmation dès réception du transfert.</p>
                  <a
                    href={`mailto:${company.email}?subject=Paiement Wise — Facture ${invoice.invoice_number}&body=Bonjour,%0D%0A%0D%0AJe souhaite régler la facture ${invoice.invoice_number} (${formatCAD(invoice.balance_due)}) via Wise. Merci de me transmettre vos coordonnées.%0D%0A%0D%0A${client.full_name}`}
                    className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm"
                  >
                    <Mail className="h-4 w-4" /> Demander les coordonnées Wise
                  </a>
                </div>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2 pb-4">
          <ShieldCheck className="h-4 w-4" />
          <span>Paiement sécurisé · TLS 1.3 · Stripe Level 1 PCI-DSS</span>
        </div>
      </div>
    </div>
  );
}
