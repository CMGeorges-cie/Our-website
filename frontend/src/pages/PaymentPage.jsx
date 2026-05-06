import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt, CreditCard, CheckCircle, Loader2, DollarSign, Shield } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice');
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [depositPercent, setDepositPercent] = useState(30);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (invoiceId) {
      axios.get(`${BACKEND_URL}/api/v1/invoices/${invoiceId}/public`)
        .then(res => setInvoice(res.data))
        .catch(() => setError('Facture introuvable'))
        .finally(() => setLoading(false));
    } else {
      setError('Aucune facture spécifiée');
      setLoading(false);
    }
  }, [invoiceId]);

  const handlePayDeposit = async () => {
    setPaying(true);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/v1/invoices/${invoiceId}/pay-deposit`, {
        deposit_percent: depositPercent,
        origin_url: window.location.origin,
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur de paiement');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Link to="/"><Button variant="outline">Retour à l'accueil</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invoice?.status === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1a365d] mb-2">Facture déjà payée</h2>
            <p className="text-gray-500">La facture {invoice.invoice_number} est entièrement payée.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const depositAmount = (invoice.total * depositPercent / 100).toFixed(2);
  const balanceDue = invoice.balance_due || invoice.total;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4" data-testid="payment-page">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://customer-assets.emergentagent.com/job_9d041269-feaf-4cbb-a5f7-16135f256136/artifacts/lzun575u_Logo%20officiel.svg" 
            alt="Déco Touché" className="h-12 mx-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-[#1a365d] font-['Outfit']">Paiement sécurisé</h1>
          <p className="text-gray-500 text-sm">Déco Touché — Paiement de dépôt</p>
        </div>

        {/* Invoice Summary */}
        <Card className="mb-6 border-0 shadow-lg" data-testid="invoice-summary">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Receipt className="h-5 w-5 text-[#d4af37]" />
              <h2 className="font-bold text-[#1a365d]">Facture {invoice.invoice_number}</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Client</span>
                <span className="font-medium">{invoice.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sous-total</span>
                <span>{invoice.subtotal?.toFixed(2)}$</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TPS (5%)</span>
                <span>{invoice.tps?.toFixed(2)}$</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TVQ (9.975%)</span>
                <span>{invoice.tvq?.toFixed(2)}$</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span className="text-[#1a365d]">Total</span>
                <span className="text-[#1a365d]">{invoice.total?.toFixed(2)}$</span>
              </div>
              {invoice.amount_paid > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Déjà payé</span>
                    <span>-{invoice.amount_paid?.toFixed(2)}$</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Solde dû</span>
                    <span>{balanceDue?.toFixed(2)}$</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deposit Options */}
        <Card className="mb-6 border-0 shadow-lg" data-testid="deposit-options">
          <CardContent className="p-6">
            <h3 className="font-bold text-[#1a365d] mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#d4af37]" /> Choisir le montant du dépôt
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDepositPercent(30)}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  depositPercent === 30
                    ? 'border-[#d4af37] bg-[#d4af37]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                data-testid="deposit-30"
              >
                <p className="text-2xl font-bold text-[#1a365d]">30%</p>
                <p className="text-sm text-[#d4af37] font-semibold">{(invoice.total * 0.30).toFixed(2)}$</p>
                <p className="text-xs text-gray-400">Minimum requis</p>
              </button>
              <button
                onClick={() => setDepositPercent(50)}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  depositPercent === 50
                    ? 'border-[#d4af37] bg-[#d4af37]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                data-testid="deposit-50"
              >
                <p className="text-2xl font-bold text-[#1a365d]">50%</p>
                <p className="text-sm text-[#d4af37] font-semibold">{(invoice.total * 0.50).toFixed(2)}$</p>
                <p className="text-xs text-gray-400">Recommandé</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Pay Button */}
        <Button
          onClick={handlePayDeposit}
          disabled={paying}
          className="w-full bg-[#d4af37] hover:bg-[#c4a030] text-[#1a365d] text-lg py-6 font-bold"
          data-testid="pay-deposit-btn"
        >
          {paying ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <CreditCard className="h-5 w-5 mr-2" />
          )}
          Payer {depositPercent}% — {depositAmount}$ CAD
        </Button>

        {/* Security */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
          <Shield className="h-3.5 w-3.5" />
          <span>Paiement sécurisé par Stripe. Vos données bancaires sont protégées.</span>
        </div>
      </div>
    </div>
  );
}
