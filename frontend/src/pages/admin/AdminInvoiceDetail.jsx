import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowLeft, Download, Printer, Send, User, Calendar, Receipt, 
  CheckCircle, AlertCircle, Clock, CreditCard, DollarSign,
  Building, Phone, Mail, MapPin, FileText, Plus, Banknote, PenTool
} from 'lucide-react';
import { SignatureDialog, SignatureDisplay } from '@/components/ui/signature-pad';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const SERVICEFLOW_LOGO = "https://customer-assets.emergentagent.com/job_57c7ca12-f939-4f77-840a-6e3a2010ce9e/artifacts/xu0d6vd3_ChatGPT%20Image%20Mar%2011%2C%202026%2C%2011_52_31%20PM.png";

const paymentMethods = [
  { value: 'cash', label: 'Espèces', icon: Banknote },
  { value: 'etransfer', label: 'Virement Interac', icon: DollarSign },
  { value: 'credit_card', label: 'Carte de crédit', icon: CreditCard },
  { value: 'cheque', label: 'Chèque', icon: FileText },
];

export default function AdminInvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'etransfer',
    reference: '',
    notes: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);

  const fetchData = async () => {
    try {
      const invoiceRes = await adminApi.getInvoice(id);
      setInvoice(invoiceRes.data);
      if (invoiceRes.data.client_id) {
        const clientRes = await adminApi.getClient(invoiceRes.data.client_id);
        setClient(clientRes.data);
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const downloadPdf = () => {
    window.open(`${BACKEND_URL}/api/v1/admin/invoices/${id}/pdf`, '_blank');
  };

  const printPdf = () => {
    const printWindow = window.open(`${BACKEND_URL}/api/v1/admin/invoices/${id}/pdf`, '_blank');
    if (printWindow) printWindow.onload = () => printWindow.print();
  };

  const sendEmail = async () => {
    setSending(true);
    try {
      const res = await adminApi.sendInvoiceByEmail(id);
      toast.success(res.data.message || 'Facture envoyée par email!');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const recordPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Montant invalide');
      return;
    }
    setSavingPayment(true);
    try {
      await adminApi.recordPayment(id, {
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference,
        notes: paymentForm.notes
      });
      toast.success('Paiement enregistré!');
      setShowPayment(false);
      setPaymentForm({ amount: '', method: 'etransfer', reference: '', notes: '' });
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSignature = async (signatureBase64) => {
    try {
      await adminApi.addInvoiceSignature(id, {
        signature_base64: signatureBase64,
        signer_name: client?.full_name || 'Client',
        signer_email: client?.email
      });
      toast.success('Signature enregistrée!');
      setShowSignature(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de l\'enregistrement de la signature');
    }
  };

  const removeSignature = async () => {
    if (!confirm('Supprimer la signature?')) return;
    try {
      await adminApi.removeInvoiceSignature(id);
      toast.success('Signature supprimée');
      fetchData();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const sendSignatureLink = async () => {
    try {
      const res = await adminApi.sendInvoiceSignatureLink(id);
      toast.success(res.data.message);
      if (res.data.signature_url) {
        // Copy to clipboard
        navigator.clipboard.writeText(res.data.signature_url);
        toast.info('Lien copié dans le presse-papier');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de l\'envoi');
    }
  };

  const copyPaymentLink = () => {
    const paymentUrl = `${window.location.origin}/paiement?invoice=${id}`;
    navigator.clipboard.writeText(paymentUrl);
    toast.success('Lien de paiement copié dans le presse-papier!');
  };


  const getStatusInfo = (status) => {
    const info = {
      paid: { label: 'Payée', class: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
      overdue: { label: 'En retard', class: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle },
      partial: { label: 'Paiement partiel', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
      sent: { label: 'Envoyée', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Send },
      draft: { label: 'Brouillon', class: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: FileText }
    };
    return info[status] || info.draft;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-4">Facture non trouvée</p>
        <Button onClick={() => navigate('/admin/invoices')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux factures
        </Button>
      </div>
    );
  }

  const statusInfo = getStatusInfo(invoice.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6" data-testid="invoice-detail-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/admin/invoices">
            <Button variant="outline" size="icon" className="border-border hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{invoice.invoice_number}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.class}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusInfo.label}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              Créée le {formatDateShort(invoice.created_at)}
              {invoice.due_date && ` • Échéance: ${formatDateShort(invoice.due_date)}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadPdf} variant="outline" className="border-border">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={printPdf} variant="outline" className="border-border">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          <Button 
            variant="outline" 
            onClick={sendEmail} 
            disabled={sending}
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Envoi...' : 'Envoyer'}
          </Button>
          {invoice.balance_due > 0 && (
            <Button 
              onClick={() => {
                setPaymentForm({ ...paymentForm, amount: invoice.balance_due.toString() });
                setShowPayment(true);
              }}
              className="bg-gold-500 hover:bg-gold-600 text-background"
            >
              <Plus className="h-4 w-4 mr-2" />
              Paiement
            </Button>
          )}
          {!invoice.signature && (
            <Button 
              onClick={() => setShowSignature(true)}
              variant="outline"
              className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10"
            >
              <PenTool className="h-4 w-4 mr-2" />
              Signature
            </Button>
          )}
          {!invoice.signature && (
            <Button 
              onClick={sendSignatureLink}
              variant="outline"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              <Mail className="h-4 w-4 mr-2" />
              Lien signature
            </Button>
          )}
          <Button 
            onClick={copyPaymentLink}
            variant="outline"
            className="border-green-500/30 text-green-400 hover:bg-green-500/10"
            data-testid="copy-payment-link-btn"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Lien de paiement
          </Button>
        </div>
      </div>

      {/* Invoice Preview Card - Professional Layout */}
      <Card className="bg-card border-border overflow-hidden">
        {/* Invoice Header */}
        <div className="bg-gradient-to-r from-gold-500/10 to-transparent p-6 border-b border-border">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            {/* Company Info */}
            <div className="flex items-start gap-4">
              <img src={SERVICEFLOW_LOGO} alt="Logo" className="w-16 h-16 rounded-xl" />
              <div>
                <h2 className="text-xl font-bold text-foreground">Déco Touché</h2>
                <p className="text-sm text-muted-foreground">Services de rénovation & design</p>
                <div className="mt-2 text-sm text-muted-foreground space-y-0.5">
                  <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Montréal, QC</p>
                  <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> (514) 555-0123</p>
                  <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> info@decotouche.ca</p>
                </div>
              </div>
            </div>

            {/* Invoice Info */}
            <div className="text-right">
              <h3 className="text-3xl font-bold text-gold-500 mb-2">FACTURE</h3>
              <p className="text-lg font-semibold text-foreground">{invoice.invoice_number}</p>
              <div className="mt-3 text-sm text-muted-foreground space-y-1">
                <p>Date: <span className="text-foreground">{formatDateShort(invoice.created_at)}</span></p>
                {invoice.due_date && (
                  <p>Échéance: <span className="text-foreground">{formatDateShort(invoice.due_date)}</span></p>
                )}
                <p>Conditions: <span className="text-foreground">{invoice.payment_terms || 'Net 30'}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="p-6 border-b border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Facturer à</h4>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-gold-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{client?.full_name || 'Client'}</p>
              {client?.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
              {client?.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}
              {client?.address && <p className="text-sm text-muted-foreground">{client.address}</p>}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
                <th className="pb-3 text-center text-xs font-semibold text-muted-foreground uppercase w-20">Qté</th>
                <th className="pb-3 text-right text-xs font-semibold text-muted-foreground uppercase w-28">Prix unit.</th>
                <th className="pb-3 text-right text-xs font-semibold text-muted-foreground uppercase w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lines || []).map((line, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="py-4 text-foreground">{line.description}</td>
                  <td className="py-4 text-center text-muted-foreground">{line.quantity}</td>
                  <td className="py-4 text-right text-muted-foreground">{formatCurrency(line.unit_price)}</td>
                  <td className="py-4 text-right font-medium text-foreground">{formatCurrency(line.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="text-foreground">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">Remise</span>
                  <span className="text-green-400">-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TPS (5%)</span>
                <span className="text-foreground">{formatCurrency(invoice.tps_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVQ (9.975%)</span>
                <span className="text-foreground">{formatCurrency(invoice.tvq_amount)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="font-bold text-foreground text-lg">Total</span>
                <span className="font-bold text-gold-500 text-xl">{formatCurrency(invoice.total)}</span>
              </div>
              {invoice.balance_due > 0 && invoice.balance_due < invoice.total && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payé</span>
                    <span className="text-green-400">{formatCurrency(invoice.total - invoice.balance_due)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-semibold text-red-400">Solde dû</span>
                    <span className="font-bold text-red-400 text-lg">{formatCurrency(invoice.balance_due)}</span>
                  </div>
                </>
              )}
              {invoice.balance_due === 0 && (
                <div className="mt-4 p-3 bg-green-500/20 rounded-lg flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="font-semibold text-green-400">PAYÉE EN TOTALITÉ</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}

          {/* Signature Section */}
          {invoice.signature && (
            <div className="mt-8">
              <SignatureDisplay 
                signature={invoice.signature.signature_base64}
                signerName={invoice.signature.signer_name}
                signedAt={invoice.signature.signed_at}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={removeSignature}
                className="mt-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Supprimer la signature
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Receipt className="h-5 w-5 text-gold-500" />
              Historique des paiements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoice.payments.map((payment, idx) => {
                const method = paymentMethods.find(m => m.value === payment.method);
                const MethodIcon = method?.icon || DollarSign;
                return (
                  <div key={idx} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <MethodIcon className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateShort(payment.date)} • {method?.label || payment.method}
                          {payment.reference && ` • Réf: ${payment.reference}`}
                        </p>
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Payment Modal */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gold-500" />
              Enregistrer un paiement
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Montant *</Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                  className="pl-8 bg-background"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Solde dû: {formatCurrency(invoice.balance_due)}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Mode de paiement</Label>
              <Select 
                value={paymentForm.method} 
                onValueChange={v => setPaymentForm({...paymentForm, method: v})}
              >
                <SelectTrigger className="mt-1.5 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2">
                        <m.icon className="h-4 w-4" />
                        {m.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Référence (optionnel)</Label>
              <Input
                value={paymentForm.reference}
                onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})}
                className="mt-1.5 bg-background"
                placeholder="Numéro de transaction, chèque..."
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Notes (optionnel)</Label>
              <Input
                value={paymentForm.notes}
                onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}
                className="mt-1.5 bg-background"
                placeholder="Notes additionnelles..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              Annuler
            </Button>
            <Button 
              onClick={recordPayment}
              disabled={savingPayment}
              className="bg-gold-500 hover:bg-gold-600 text-background"
            >
              {savingPayment ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <SignatureDialog
        open={showSignature}
        onOpenChange={setShowSignature}
        onSignatureComplete={handleSignature}
        title="Signature du client"
        description="Le client signe pour confirmer l'acceptation de cette facture et des conditions."
        signerName={client?.full_name}
        documentType="facture"
      />
    </div>
  );
}
