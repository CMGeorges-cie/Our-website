import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { BRAND, BRAND_LOGO_URL } from '@/config/brand';
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
                <div className="w-12 h-12 rounded-lg bg-[#111111] flex items-center justify-center overflow-hidden">
                  <img src={BRAND_LOGO_URL} alt={BRAND.name} className="h-10 w-10 object-contain" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#111111] font-['Outfit']">{BRAND.name}</h2>
                  <p className="text-xs text-gray-500">{BRAND.tagline}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>{BRAND.address}</p>
                <p>{BRAND.phone.display}</p>
                <p>{BRAND.email}</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-[#111111] mb-2 font-['Outfit']">SOUMISSION</h1>
              <p className="text-gray-600"><strong>No:</strong> {quote.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-gray-600"><strong>Date:</strong> {formatDate(quote.created_at)}</p>
              <p className="text-gray-600"><strong>Valide jusqu'au:</strong> {quote.valid_until ? formatDate(quote.valid_until) : '30 jours'}</p>
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Client</h3>
            <p className="font-semibold text-[#111111] text-lg">{lead.full_name}</p>
            <p className="text-gray-600">{lead.email}</p>
            <p className="text-gray-600">{lead.phone}</p>
            {lead.address && <p className="text-gray-600">{lead.address}, {lead.city}</p>}
          </div>

          {/* Vue interne : heures totales du projet */}
          {quote.total_hours > 0 && (
            <div className="mb-6 p-3 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/40 text-sm" data-testid="quote-internal-hours">
              <span className="font-semibold">Vue interne :</span> total des heures estimées : <strong>{quote.total_hours} h</strong>
              {quote.admin_amount > 0 && <> • Frais d'achat/admin/magasinage : {formatCurrency(quote.admin_amount)} ({quote.admin_percent}%)</>}
            </div>
          )}

          {/* Main-d'œuvre — toujours séparée des matériaux */}
          {quote.lines.filter(l => l.line_type === 'labor').length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide mb-3">Main-d'œuvre</h3>
              <table className="w-full" data-testid="quote-labor-table">
                <thead>
                  <tr className="bg-[#111111] text-white">
                    <th className="px-4 py-3 text-left rounded-tl-lg">Étape</th>
                    <th className="px-4 py-3 text-center w-28">Durée estimée</th>
                    <th className="px-4 py-3 text-right w-32 rounded-tr-lg">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.filter(l => l.line_type === 'labor').map((line, idx) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{line.description}</td>
                      <td className="px-4 py-3 text-center">{line.hours ? `${line.hours} h` : '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(line.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-right text-sm mt-2">Sous-total main-d'œuvre : <strong>{formatCurrency(quote.subtotal_labor)}</strong></p>
            </div>
          )}

          {/* Matériaux fournis par Déco Touché */}
          {quote.lines.filter(l => l.line_type === 'material' && l.source_type !== 'client').length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide mb-3">Matériaux et produits</h3>
              <table className="w-full" data-testid="quote-materials-table">
                <thead>
                  <tr className="bg-[#111111] text-white">
                    <th className="px-4 py-3 text-left rounded-tl-lg">Description</th>
                    <th className="px-4 py-3 text-left w-36">Source</th>
                    <th className="px-4 py-3 text-center w-16">Qté</th>
                    <th className="px-4 py-3 text-right w-28">Prix unit.</th>
                    <th className="px-4 py-3 text-right w-28 rounded-tr-lg">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.filter(l => l.line_type === 'material' && l.source_type !== 'client').map((line, idx) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{line.description}</td>
                      <td className="px-4 py-3 text-gray-600">{line.source_name || 'Fournisseur'}</td>
                      <td className="px-4 py-3 text-center">{line.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        {line.price_status === 'a_confirmer'
                          ? <span className="text-amber-600 font-medium text-xs uppercase">À confirmer</span>
                          : formatCurrency(line.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {line.price_status === 'a_confirmer' ? '—' : formatCurrency(line.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-right text-sm mt-2">Sous-total matériaux : <strong>{formatCurrency(quote.subtotal_material)}</strong></p>
            </div>
          )}

          {/* Achats par le client — indicatif, hors total */}
          {quote.lines.filter(l => l.line_type === 'material' && l.source_type === 'client').length > 0 && (
            <div className="mb-8 p-4 bg-gray-50 rounded-lg" data-testid="quote-client-materials">
              <h3 className="text-sm font-bold uppercase tracking-wide mb-1">À acheter par le client</h3>
              <p className="text-xs text-gray-500 mb-3">Prix indicatifs seulement, non inclus dans le total de l'estimation.</p>
              <table className="w-full">
                <tbody>
                  {quote.lines.filter(l => l.line_type === 'material' && l.source_type === 'client').map((line, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="px-4 py-2">{line.description}</td>
                      <td className="px-4 py-2 text-gray-600">{line.source_name || 'Au choix du client'}</td>
                      <td className="px-4 py-2 text-center">{line.quantity}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(line.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-right text-sm mt-2">Total indicatif : <strong>{formatCurrency(quote.client_material_total || 0)}</strong> (non inclus)</p>
            </div>
          )}

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
                {quote.admin_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Achat, administration et magasinage ({quote.admin_percent}%):</span>
                    <span>{formatCurrency(quote.admin_amount)}</span>
                  </div>
                )}
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
                
                <div className="flex justify-between pt-3 mt-2 border-t-2 border-[#111111]">
                  <span className="text-xl font-bold text-[#111111]">TOTAL:</span>
                  <span className="text-xl font-bold text-[#111111]">{formatCurrency(quote.total_with_tax)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="mt-8 p-6 bg-[#111111]/5 rounded-lg">
            <h4 className="font-semibold text-[#111111] mb-4">Modalités de paiement</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Dépôt (30%)</p>
                <p className="font-semibold text-[#111111]">{formatCurrency(quote.deposit_amount)}</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Mi-projet (30%)</p>
                <p className="font-semibold text-[#111111]">{formatCurrency(quote.milestone_amount)}</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Final (40%)</p>
                <p className="font-semibold text-[#111111]">{formatCurrency(quote.final_amount)}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg" data-testid="quote-notes">
              <h4 className="font-semibold text-[#111111] mb-2">Notes</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Documentation visuelle : photos des lieux, mesures, croquis */}
          {((quote.rooms && quote.rooms.length > 0) || (quote.photos && quote.photos.length > 0)) && (
            <div className="mt-8" data-testid="quote-visual-doc">
              <h3 className="text-sm font-bold uppercase tracking-wide mb-3">Documentation visuelle</h3>
              <p className="text-xs text-gray-500 mb-4">Photos des lieux et mesures prises lors de la visite, et croquis du projet. Cette section fait aussi partie du PDF de soumission.</p>

              {(quote.rooms || []).map((room, ri) => {
                const roomPhotos = (quote.photos || []).filter(p => p.kind !== 'croquis' && (p.room_name || '').trim().toLowerCase() === (room.name || '').trim().toLowerCase());
                const dims = [room.length_ft, room.width_ft].filter(Boolean).map(v => `${v} pi`).join(' × ');
                const area = room.length_ft && room.width_ft ? Math.round(room.length_ft * room.width_ft) : null;
                return (
                  <div key={ri} className="mb-5">
                    <p className="font-semibold text-[#111111]">{room.name}</p>
                    {(dims || room.height_ft) && (
                      <p className="text-sm text-gray-600">
                        Mesures : {dims}{room.height_ft ? `${dims ? ' × ' : ''}${room.height_ft} pi de haut` : ''}{area ? ` — surface au sol ≈ ${area} pi²` : ''}
                      </p>
                    )}
                    {room.notes && <p className="text-sm text-gray-500">{room.notes}</p>}
                    {roomPhotos.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {roomPhotos.map((p, pi) => (
                          <figure key={pi}>
                            <img src={p.url.startsWith('http') ? p.url : `${BACKEND_URL}${p.url}`} alt={p.caption || room.name} className="w-full h-44 object-cover rounded-lg border border-gray-200" />
                            {p.caption && <figcaption className="text-xs text-gray-500 mt-1">{p.caption}</figcaption>}
                          </figure>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {(quote.photos || []).filter(p => p.kind !== 'croquis' && !(quote.rooms || []).some(r => (r.name || '').trim().toLowerCase() === (p.room_name || '').trim().toLowerCase())).length > 0 && (
                <div className="mb-5">
                  {(quote.rooms || []).length > 0 && <p className="font-semibold text-[#111111] mb-2">Autres photos des lieux</p>}
                  <div className="grid grid-cols-2 gap-3">
                    {(quote.photos || []).filter(p => p.kind !== 'croquis' && !(quote.rooms || []).some(r => (r.name || '').trim().toLowerCase() === (p.room_name || '').trim().toLowerCase())).map((p, pi) => (
                      <figure key={pi}>
                        <img src={p.url.startsWith('http') ? p.url : `${BACKEND_URL}${p.url}`} alt={p.caption || 'Photo des lieux'} className="w-full h-44 object-cover rounded-lg border border-gray-200" />
                        {p.caption && <figcaption className="text-xs text-gray-500 mt-1">{p.caption}</figcaption>}
                      </figure>
                    ))}
                  </div>
                </div>
              )}

              {(quote.photos || []).filter(p => p.kind === 'croquis').length > 0 && (
                <div className="mb-2">
                  <p className="font-semibold text-[#111111] mb-2">Croquis du projet</p>
                  {(quote.photos || []).filter(p => p.kind === 'croquis').map((p, pi) => (
                    <figure key={pi} className="mb-3">
                      <img src={p.url.startsWith('http') ? p.url : `${BACKEND_URL}${p.url}`} alt={p.caption || 'Croquis du projet'} className="w-full max-h-96 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                      {p.caption && <figcaption className="text-xs text-gray-500 mt-1">{p.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mentions obligatoires */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-600 space-y-1.5" data-testid="quote-mentions">
            <p className="font-semibold text-gray-800 text-sm">Bon à savoir</p>
            <p>• Cette estimation est approximative : le prix des matériaux et les quantités peuvent changer selon ce qu'on trouve sur place. Le prix final vous est toujours confirmé avant le début des travaux.</p>
            <p>• Visite de mesure : 49 $ + taxes, déduite à 100 % si vous réalisez le projet avec nous.</p>
            <p>• Les montants sont en dollars canadiens; la TPS et la TVQ s'ajoutent au sous-total, comme indiqué ci-dessus.</p>
            <p>• Estimation valide jusqu'au {quote.valid_until ? formatDate(quote.valid_until) : '30 jours'} ({quote.validity_days || 30} jours).</p>
            <p className="pt-1 text-gray-400">TPS: {BRAND.taxes.gst} | TVQ: {BRAND.taxes.qst}</p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#d4af37] text-center">
            <p className="text-[#111111] font-semibold">Merci de faire confiance à {BRAND.name}!</p>
            <p className="text-xs text-gray-400 mt-1">{BRAND.phone.display} | {BRAND.email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
