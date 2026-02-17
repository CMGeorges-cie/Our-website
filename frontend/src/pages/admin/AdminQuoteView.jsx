import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, Printer, Download } from 'lucide-react';

export default function AdminQuoteView() {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (!quote || !lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Soumission non trouvée</p>
        <Link to="/admin/leads">
          <Button variant="outline" className="mt-4">
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
      <div className="flex items-center justify-between mb-8 no-print">
        <div className="flex items-center gap-4">
          <Link to={`/admin/leads/${lead.id}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1a365d] font-['Outfit']">
              Soumission #{quote.id.slice(0, 8)}
            </h1>
            <p className="text-gray-500">{lead.full_name} • {formatDate(quote.created_at)}</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="btn-primary" data-testid="print-quote-btn">
          <Printer className="mr-2 h-4 w-4" />
          Imprimer
        </Button>
      </div>

      {/* Quote Document */}
      <div className="quote-document" data-testid="quote-document">
        {/* Header */}
        <div className="quote-header">
          <div>
            <img 
              src="https://customer-assets.emergentagent.com/job_cmgeorges-prod/artifacts/3w0w7gaw_logo_cmgeorges.svg" 
              alt="CMGeorges"
              className="h-16 w-auto mb-4"
            />
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-[#1a365d]">CMGeorges</p>
              <p>Montréal & Rive-Sud, QC</p>
              <p>Tél: 514-386-1743</p>
              <p>info@cmgeorges.com</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-[#1a365d] mb-2 font-['Outfit']">SOUMISSION</h2>
            <p className="text-gray-600">
              <strong>No:</strong> {quote.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-gray-600">
              <strong>Date:</strong> {formatDate(quote.created_at)}
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold text-[#1a365d]">{lead.full_name}</p>
              <p className="text-sm text-gray-600">{lead.email}</p>
              <p className="text-sm text-gray-600">{lead.phone}</p>
              {lead.address && (
                <p className="text-sm text-gray-600">{lead.address}, {lead.city}</p>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <table className="quote-table" data-testid="quote-lines-table">
          <thead>
            <tr>
              <th className="rounded-tl-lg">Description</th>
              <th className="text-center">Qté</th>
              <th className="text-right">Prix unit.</th>
              <th className="text-right">Prix marché</th>
              <th className="text-right rounded-tr-lg">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((line, idx) => (
              <tr key={idx}>
                <td>
                  {line.description}
                  <span className="block text-xs text-gray-500 capitalize">
                    {line.line_type === 'material' ? 'Matériel' : 'Main-d\'œuvre'}
                  </span>
                </td>
                <td className="text-center">{line.quantity}</td>
                <td className="text-right">{formatCurrency(line.unit_price)}</td>
                <td className="text-right text-gray-400">
                  {line.market_price ? formatCurrency(line.market_price) : '-'}
                </td>
                <td className="text-right font-medium">{formatCurrency(line.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Market Comparison */}
          {quote.market_price_total > 0 && (
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg" data-testid="market-comparison">
              <h4 className="font-semibold text-green-800 mb-4">Comparatif Prix</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Prix marché (estimé):</span>
                  <span className="line-through text-gray-500">{formatCurrency(quote.market_price_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Prix CMGeorges:</span>
                  <span className="font-semibold text-green-800">{formatCurrency(quote.subtotal_material)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-green-200">
                  <span className="font-semibold text-green-800">Vos économies:</span>
                  <span className="font-bold text-green-600">{formatCurrency(quote.cmgeorges_savings)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Totals Breakdown */}
          <div className="quote-totals ml-auto w-full md:w-auto" data-testid="quote-totals">
            <div className="quote-total-row">
              <span>Sous-total main-d'œuvre:</span>
              <span>{formatCurrency(quote.subtotal_labor)}</span>
            </div>
            <div className="quote-total-row">
              <span>Sous-total matériel:</span>
              <span>{formatCurrency(quote.subtotal_material)}</span>
            </div>
            {quote.delivery_fee > 0 && (
              <div className="quote-total-row">
                <span>Livraison:</span>
                <span>{formatCurrency(quote.delivery_fee)}</span>
              </div>
            )}
            {quote.urgency_fee > 0 && (
              <div className="quote-total-row text-orange-600">
                <span>Frais d'urgence:</span>
                <span>{formatCurrency(quote.urgency_fee)}</span>
              </div>
            )}
            <div className="quote-total-row border-t pt-2 mt-2">
              <span className="font-medium">Sous-total:</span>
              <span className="font-medium">{formatCurrency(quote.subtotal_before_contingency)}</span>
            </div>
            <div className="quote-total-row text-[#d4af37]">
              <span>Imprévu ({quote.contingency_percent}%):</span>
              <span>{formatCurrency(quote.contingency_amount)}</span>
            </div>
            <div className="quote-total-row font-semibold border-t pt-2 mt-2">
              <span>Total avant taxes:</span>
              <span>{formatCurrency(quote.subtotal_before_tax)}</span>
            </div>
            <div className="quote-total-row text-gray-600">
              <span>TPS ({quote.tps_rate}%):</span>
              <span>{formatCurrency(quote.tps_amount)}</span>
            </div>
            <div className="quote-total-row text-gray-600">
              <span>TVQ ({quote.tvq_rate}%):</span>
              <span>{formatCurrency(quote.tvq_amount)}</span>
            </div>
            <div className="quote-total-final text-[#1a365d]">
              <span>TOTAL:</span>
              <span>{formatCurrency(quote.total_with_tax)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="mt-8 p-6 bg-gray-50 rounded-lg" data-testid="quote-notes">
            <h4 className="font-semibold text-[#1a365d] mb-2">Notes</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Terms & Conditions */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h4 className="font-semibold text-[#1a365d] mb-4">Conditions</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• Cette soumission est valide pour 30 jours à compter de la date d'émission.</p>
            <p>• Un dépôt de 50% est requis pour confirmer la commande.</p>
            <p>• Le solde est payable à la fin des travaux.</p>
            <p>• Garantie: Notre travail est garanti. Correction gratuite si non conforme.</p>
            <p>• L'imprévu ({quote.contingency_percent}%) couvre les situations imprévues et ajustements mineurs.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-[#1a365d] text-center">
          <p className="text-sm text-gray-500">
            Merci de faire confiance à CMGeorges!
          </p>
          <p className="text-xs text-gray-400 mt-2">
            TPS: 123456789 RT0001 | TVQ: 1234567890 TQ0001
          </p>
        </div>
      </div>
    </div>
  );
}
