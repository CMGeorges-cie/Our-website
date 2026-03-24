import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignaturePad } from '@/components/ui/signature-pad';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  FileText, User, Calendar, CheckCircle, Building, 
  Phone, Mail, MapPin, AlertCircle, Loader2, PenTool
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PublicSignaturePage() {
  const { type, token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signature, setSignature] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchDocument();
  }, [type, token]);

  const fetchDocument = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/sign/${type}/${token}`);
      setData(response.data);
      if (response.data.client) {
        setSignerName(response.data.client.full_name || '');
        setSignerEmail(response.data.client.email || '');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Document non trouvé ou lien expiré');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!signature) {
      toast.error('Veuillez signer le document');
      return;
    }
    if (!signerName) {
      toast.error('Veuillez entrer votre nom');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${BACKEND_URL}/sign/${type}/${token}`, {
        signature_base64: signature,
        signer_name: signerName,
        signer_email: signerEmail
      });
      setSuccess(true);
      toast.success('Document signé avec succès!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la signature');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gold-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Lien invalide</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Merci!</h2>
            <p className="text-muted-foreground mb-4">
              {type === 'quote' 
                ? 'Votre devis a été signé et accepté.' 
                : 'Votre facture a été signée.'}
            </p>
            <p className="text-sm text-muted-foreground">
              Une confirmation a été envoyée par email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { document: doc, client, company } = data;
  const isQuote = type === 'quote';

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src={company.logo} 
            alt={company.name}
            className="h-16 w-16 rounded-xl mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gold-500">{company.name}</h1>
          <p className="text-muted-foreground">{company.tagline}</p>
        </div>

        {/* Document Preview */}
        <Card className="bg-card border-border overflow-hidden">
          {/* Document Header */}
          <div className="bg-gradient-to-r from-gold-500/10 to-transparent p-6 border-b border-border">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {isQuote ? 'DEVIS' : 'FACTURE'}
                </h2>
                <p className="text-gold-500 font-semibold">
                  {doc.quote_number || doc.invoice_number}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Date: {formatDateShort(doc.created_at)}</p>
                {doc.due_date && <p>Échéance: {formatDateShort(doc.due_date)}</p>}
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            {/* Client Info */}
            <div className="mb-6 p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase mb-2">Client</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gold-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{client?.full_name}</p>
                  {client?.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-muted-foreground">Description</th>
                    <th className="pb-2 text-center text-muted-foreground w-16">Qté</th>
                    <th className="pb-2 text-right text-muted-foreground w-24">Prix</th>
                    <th className="pb-2 text-right text-muted-foreground w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(doc.lines || doc.items || []).map((line, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-3 text-foreground">{line.description || line.name}</td>
                      <td className="py-3 text-center text-muted-foreground">{line.quantity || 1}</td>
                      <td className="py-3 text-right text-muted-foreground">
                        {formatCurrency(line.unit_price || line.price || 0)}
                      </td>
                      <td className="py-3 text-right font-medium text-foreground">
                        {formatCurrency(line.line_total || (line.quantity || 1) * (line.unit_price || line.price || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="text-foreground">{formatCurrency(doc.subtotal || 0)}</span>
                </div>
                {doc.tps_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TPS (5%)</span>
                    <span className="text-foreground">{formatCurrency(doc.tps_amount)}</span>
                  </div>
                )}
                {doc.tvq_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TVQ (9.975%)</span>
                    <span className="text-foreground">{formatCurrency(doc.tvq_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="font-bold text-xl text-gold-500">{formatCurrency(doc.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {doc.notes && (
              <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase mb-2">Notes</p>
                <p className="text-sm text-muted-foreground">{doc.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <PenTool className="h-5 w-5 text-gold-500" />
              <h3 className="text-lg font-bold text-foreground">Signature électronique</h3>
            </div>

            {/* Legal Text */}
            <div className="mb-6 p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              <p className="mb-2">
                En signant ce document, je confirme avoir lu et accepté les termes et conditions décrits ci-dessus.
                Cette signature électronique a la même valeur légale qu'une signature manuscrite conformément 
                à la Loi concernant le cadre juridique des technologies de l'information du Québec.
              </p>
              <p className="font-medium text-foreground">
                Date de signature: {new Date().toLocaleDateString('fr-CA')} à {new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Signer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="text-sm font-medium">Votre nom complet *</Label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Prénom et nom"
                  className="mt-1.5 bg-background"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Courriel (optionnel)</Label>
                <Input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="mt-1.5 bg-background"
                />
              </div>
            </div>

            {/* Signature Pad */}
            <div className="mb-6">
              <Label className="text-sm font-medium mb-3 block">Votre signature *</Label>
              <SignaturePad 
                onSave={setSignature}
                width={500}
                height={180}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !signature || !signerName}
              className="w-full bg-gold-500 hover:bg-gold-600 text-background h-12 text-lg font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signature en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {isQuote ? 'Signer et accepter le devis' : 'Signer la facture'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="h-4 w-4" /> {company.phone}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-4 w-4" /> {company.email}
            </span>
          </p>
          <p className="mt-2">© {new Date().getFullYear()} {company.name}. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
}
