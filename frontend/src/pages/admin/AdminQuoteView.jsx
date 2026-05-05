import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, Printer, Download, Send } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminQuoteView() {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const quoteRes = await adminApi.getQuote(id);
        setQuote(quoteRes.data);
        
        const leadRes = await adminApi.getLead(quoteRes.data.lead_id);
        setLead(leadRes.data);
      } catch (error) {
        console.error('Error fetching quote:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSendEmail = async () => {
    setSending(true);
    try {
      const res = await adminApi.sendQuoteByEmail(id);
      toast.success(res.data.message || 'Soumission envoyée par email!');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.open(`${BACKEND_URL}/api/v1/admin/quotes/${id}/pdf`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400 ml-4">Chargement...</p>
      </div>
    );
  }

  if (!quote || !lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Soumission non trouvée</p>
        <Link to="/admin/leads">
          <Button variant="outline" className="mt-4 border-gray-700 hover:bg-gray-800">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux leads
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="admin-quote-view">
      {/* Header (no-print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
        <div className="flex items-center gap-4">
          <Link to={`/admin/leads/${lead.id}`}>
            <Button variant="outline" size="icon" className="border-gray-700 hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white font-['Outfit']">
              Soumission #{quote.id.slice(0, 8)}
            </h1>
            <p className="text-gray-400">{lead.full_name} • {formatDate(quote.created_at)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadPdf} variant="outline" className="border-gray-700 hover:bg-gray-800 text-white">
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button onClick={handlePrint} variant="outline" className="border-gray-700 hover:bg-gray-800 text-white">
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          <Button className="bg-gold-500 hover:bg-gold-600 text-black" onClick={handleSendEmail} disabled={sending} data-testid="send-quote-email-btn">
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </div>
      </div>

      {/* Quote Document - Clean Professional Design */}
      <Card className="bg-white text-gray-900 overflow-hidden" data-testid="quote-document">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-8 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#1a365d] rounded-lg flex items-center justify-center">
                  <span className="text-[#d4af37] text-2xl">🦁</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#1a365d] font-['Outfit']">Déco Touché</h2>
                  <p className="text-xs text-gray-500">Services professionnels</p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>Montréal & Rive-Sud, QC</p>
                <p>514-386-1743</p>
                <p>info@decotouche.ca</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-[#1a365d] mb-2 font-['Outfit']">SOUMISSION</h1>
              <p className="text-gray-600"><strong>No:</strong> {quote.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-gray-600"><strong>Date:</strong> {formatDate(quote.created_at)}</p>
              <p className="text-gray-600"><strong>Valide jusqu'au:</strong> {quote.valid_until ? formatDate(quote.valid_until) : '30 jours'}</p>
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Client</h3>
            <p className="font-semibold text-[#1a365d] text-lg">{lead.full_name}</p>
            <p className="text-gray-600">{lead.email}</p>
            <p className="text-gray-600">{lead.phone}</p>
            {lead.address && <p className="text-gray-600">{lead.address}, {lead.city}</p>}
          </div>

          {/* Line Items - Simple Clean Table */}
          <div className="mb-8">
            <table className="w-full" data-testid="quote-lines-table">
              <thead>
                <tr className="bg-[#1a365d] text-white">
                  <th className="px-4 py-3 text-left rounded-tl-lg">Description</th>
                  <th className="px-4 py-3 text-center w-20">Qté</th>
                  <th className="px-4 py-3 text-right w-32">Prix unit.</th>
                  <th className="px-4 py-3 text-right w-32 rounded-tr-lg">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((line, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{line.description}</p>
                      <span className="text-xs text-gray-500 capitalize">
                        {line.line_type === 'material' ? 'Matériel' : 'Main-d\'œuvre'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{line.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(line.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(line.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals - Clean Right-Aligned */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm" data-testid="quote-totals">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total main-d'œuvre:</span>
                  <span>{formatCurrency(quote.subtotal_labor)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total matériel:</span>
                  <span>{formatCurrency(quote.subtotal_material)}</span>
                </div>
                {quote.delivery_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Livraison:</span>
                    <span>{formatCurrency(quote.delivery_fee)}</span>
                  </div>
                )}
                
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-medium">Sous-total:</span>
                  <span className="font-medium">{formatCurrency(quote.subtotal_before_contingency)}</span>
                </div>
                
                <div className="flex justify-between text-[#d4af37]">
                  <span>Imprévu ({quote.contingency_percent}%):</span>
                  <span>{formatCurrency(quote.contingency_amount)}</span>
                </div>
                
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">TPS ({quote.tps_rate}%):</span>
                  <span>{formatCurrency(quote.tps_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TVQ ({quote.tvq_rate}%):</span>
                  <span>{formatCurrency(quote.tvq_amount)}</span>
                </div>
                
                <div className="flex justify-between pt-3 mt-2 border-t-2 border-[#1a365d]">
                  <span className="text-xl font-bold text-[#1a365d]">TOTAL:</span>
                  <span className="text-xl font-bold text-[#1a365d]">{formatCurrency(quote.total_with_tax)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="mt-8 p-6 bg-[#1a365d]/5 rounded-lg">
            <h4 className="font-semibold text-[#1a365d] mb-4">Modalités de paiement</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Dépôt (30%)</p>
                <p className="font-semibold text-[#1a365d]">{formatCurrency(quote.deposit_amount)}</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Mi-projet (30%)</p>
                <p className="font-semibold text-[#1a365d]">{formatCurrency(quote.milestone_amount)}</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Final (40%)</p>
                <p className="font-semibold text-[#1a365d]">{formatCurrency(quote.final_amount)}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg" data-testid="quote-notes">
              <h4 className="font-semibold text-[#1a365d] mb-2">Notes</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Terms */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500">
            <p>• Soumission valide 30 jours • Dépôt requis pour confirmer • Garantie satisfaction incluse</p>
            <p className="mt-2">TPS: 123456789 RT0001 | TVQ: 1234567890 TQ0001</p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#d4af37] text-center">
            <p className="text-[#1a365d] font-semibold">Merci de faire confiance à Déco Touché!</p>
            <p className="text-xs text-gray-400 mt-1">514-386-1743 | info@decotouche.ca</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
