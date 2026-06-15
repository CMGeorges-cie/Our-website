import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { adminApi, aiApi, apiV2 } from '@/lib/api';
import InvoiceCatalogDialog from '@/components/admin/invoices/InvoiceCatalogDialog';
import { 
  formatDate, 
  formatCurrency, 
  getStatusLabel, 
  getServiceLabel, 
  getItemTypeLabel,
  getBrandLabel,
  getUrgencyLabel,
  getSourceLabel
} from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  Clock,
  Package,
  Plus,
  Trash2,
  Sparkles,
  Loader2
} from 'lucide-react';

const statusOptions = [
  { value: 'new', label: 'Nouveau' },
  { value: 'contacted', label: 'Contacté' },
  { value: 'quoted', label: 'Soumis' },
  { value: 'won', label: 'Gagné' },
  { value: 'lost', label: 'Perdu' },
];

const emptyLine = {
  description: '',
  quantity: 1,
  unit_price: 0,
  market_price: 0,
  line_type: 'labor'
};

const BASE_PRICES = {
  bed: 85, dresser: 65, desk: 60, wardrobe: 125,
  sofa: 75, table: 60, chair: 35, shelf: 50, other: 50,
};

const getBasePrice = (itemType) => BASE_PRICES[itemType] || 50;

export default function AdminLeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  
  // Quote form state
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteLines, setQuoteLines] = useState([{ ...emptyLine }]);
  const [contingencyPercent, setContingencyPercent] = useState(15);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [urgencyFee, setUrgencyFee] = useState(0);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogServices, setCatalogServices] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadRes, quotesRes] = await Promise.all([
          adminApi.getLead(id),
          adminApi.getQuotes({ lead_id: id })
        ]);
        
        setLead(leadRes.data);
        setStatus(leadRes.data.status);
        setNotes(leadRes.data.notes || '');
        setQuotes(quotesRes.data);
        
        // Pre-fill urgency fee if urgent
        if (leadRes.data.urgency_level === 'urgent') {
          setUrgencyFee(100);
        }
        
        // Pre-fill quote lines based on items
        if (leadRes.data.items?.length > 0) {
          const lines = leadRes.data.items.map(item => ({
            description: `Assemblage ${getItemTypeLabel(item.item_type)} ${getBrandLabel(item.brand)} ${item.model || ''}`.trim(),
            quantity: item.quantity,
            unit_price: getBasePrice(item.item_type),
            market_price: getBasePrice(item.item_type) * 1.5,
            line_type: 'labor'
          }));
          
          // Add wall anchoring if required
          const anchorsNeeded = leadRes.data.items.filter(i => i.wall_anchor_required).length;
          if (anchorsNeeded > 0) {
            lines.push({
              description: 'Kit ancrage mural sécuritaire',
              quantity: anchorsNeeded,
              unit_price: 25,
              market_price: 40,
              line_type: 'material'
            });
          }
          
          setQuoteLines(lines);
        }
      } catch (error) {
        console.error('Error fetching lead:', error);
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleUpdateLead = async () => {
    setSaving(true);
    try {
      await adminApi.updateLead(id, { status, notes });
      toast.success('Lead mis à jour');
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const addQuoteLine = () => {
    setQuoteLines([...quoteLines, { ...emptyLine }]);
  };

  // Load service catalog on demand (first time the catalog dialog opens).
  const openCatalog = async () => {
    if (catalogServices.length === 0) {
      try {
        const res = await apiV2.get('/catalog');
        setCatalogServices(res.data || []);
      } catch (e) {
        // Soft fail — catalog stays empty, dialog shows "Aucun service trouvé".
      }
    }
    setShowCatalog(true);
  };

  // Add a line from the catalog by mapping the service to a quote line.
  const addFromCatalog = (service) => {
    setQuoteLines((prev) => [
      ...prev.filter((l) => l.description),
      {
        description: service.name,
        quantity: 1,
        unit_price: service.base_price || 0,
        market_price: 0,
        line_type: 'labor',
      },
    ]);
    setShowCatalog(false);
  };

  const filteredCatalog = catalogServices.filter((s) =>
    !catalogSearch || (s.name || '').toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const updateQuoteLine = (index, field, value) => {
    setQuoteLines(quoteLines.map((line, i) => 
      i === index ? { ...line, [field]: value } : line
    ));
  };

  const removeQuoteLine = (index) => {
    if (quoteLines.length > 1) {
      setQuoteLines(quoteLines.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    let subtotalMaterial = 0;
    let subtotalLabor = 0;
    let marketTotal = 0;

    quoteLines.forEach(line => {
      const lineTotal = line.quantity * line.unit_price;
      if (line.line_type === 'material') {
        subtotalMaterial += lineTotal;
      } else {
        subtotalLabor += lineTotal;
      }
      if (line.market_price) {
        marketTotal += line.quantity * line.market_price;
      }
    });

    const subtotalBeforeContingency = subtotalMaterial + subtotalLabor + deliveryFee + urgencyFee;
    const contingencyAmount = subtotalBeforeContingency * (contingencyPercent / 100);
    const subtotalBeforeTax = subtotalBeforeContingency + contingencyAmount;
    const tps = subtotalBeforeTax * 0.05;
    const tvq = subtotalBeforeTax * 0.09975;
    const total = subtotalBeforeTax + tps + tvq;
    const savings = marketTotal - subtotalMaterial;

    return {
      subtotalMaterial,
      subtotalLabor,
      deliveryFee,
      urgencyFee,
      subtotalBeforeContingency,
      contingencyAmount,
      subtotalBeforeTax,
      tps,
      tvq,
      total,
      marketTotal,
      savings: savings > 0 ? savings : 0
    };
  };

  const handleAIDraft = async () => {
    setAiLoading(true);
    try {
      const res = await aiApi.draftQuote({
        lead_id: id,
        prompt: aiPrompt || null,
      });
      const draft = res.data;
      if (draft.lines && draft.lines.length > 0) {
        setQuoteLines(draft.lines.map(l => ({
          description: l.description || '',
          quantity: l.quantity || 1,
          unit_price: l.unit_price || 0,
          market_price: 0,
          line_type: l.line_type === 'material' ? 'material' : 'labor',
        })));
      }
      if (draft.contingency_percent) {
        setContingencyPercent(Math.min(20, Math.max(10, draft.contingency_percent)));
      }
      if (draft.notes || draft.summary) {
        setQuoteNotes([draft.summary, draft.notes].filter(Boolean).join('\n\n'));
      }
      toast.success("Brouillon généré par Claude. Vérifiez et ajustez les prix avant d'envoyer.");
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Erreur lors de la génération IA');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateQuote = async () => {    setCreatingQuote(true);
    try {
      const response = await adminApi.createQuote({
        lead_id: id,
        lines: quoteLines,
        contingency_percent: contingencyPercent,
        delivery_fee: deliveryFee,
        urgency_fee: urgencyFee,
        notes: quoteNotes
      });
      
      toast.success('Soumission créée!');
      navigate(`/admin/quotes/${response.data.id}`);
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setCreatingQuote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lead non trouvé</p>
        <Link to="/admin/leads">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux leads
          </Button>
        </Link>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div data-testid="admin-lead-detail">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link to="/admin/leads">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1a365d] font-['Outfit']">{lead.full_name}</h1>
            <p className="text-gray-500">{getServiceLabel(lead.service_type)} • {formatDate(lead.created_at)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowQuoteForm(!showQuoteForm)}
            data-testid="toggle-quote-form-btn"
          >
            <FileText className="mr-2 h-4 w-4" />
            {showQuoteForm ? 'Masquer' : 'Créer une soumission'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card data-testid="lead-contact-card">
            <CardHeader>
              <CardTitle>Informations de contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Courriel</p>
                    <a href={`mailto:${lead.email}`} className="text-[#1a365d] hover:underline">
                      {lead.email}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <a href={`tel:${lead.phone}`} className="text-[#1a365d] hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Adresse</p>
                    <p>{lead.address || '-'}, {lead.city || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date souhaitée</p>
                    <p>{lead.preferred_date || 'Non spécifiée'}</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <p className="text-sm text-gray-500 mb-2">Description du projet</p>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {lead.description || 'Aucune description fournie'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Furniture Items */}
          {lead.items?.length > 0 && (
            <Card data-testid="lead-items-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Meubles à assembler ({lead.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lead.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      data-testid={`lead-item-${idx}`}
                    >
                      <div>
                        <p className="font-medium">
                          {getItemTypeLabel(item.item_type)} - {getBrandLabel(item.brand)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.model && `Modèle: ${item.model}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">x{item.quantity}</p>
                        {item.wall_anchor_required && (
                          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                            Ancrage requis
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Quotes */}
          {quotes.length > 0 && (
            <Card data-testid="lead-quotes-card">
              <CardHeader>
                <CardTitle>Soumissions existantes ({quotes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quotes.map((quote) => (
                    <Link 
                      key={quote.id} 
                      to={`/admin/quotes/${quote.id}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      data-testid={`quote-link-${quote.id}`}
                    >
                      <div>
                        <p className="font-medium">Soumission #{quote.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-500">{formatDate(quote.created_at)}</p>
                      </div>
                      <p className="text-lg font-bold text-[#1a365d]">
                        {formatCurrency(quote.total_with_tax)}
                      </p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quote Creation Form */}
          {showQuoteForm && (
            <Card data-testid="quote-form-card">
              <CardHeader>
                <CardTitle>Nouvelle soumission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* AI Assistant */}
                <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-4" data-testid="ai-draft-panel">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="font-semibold text-purple-900 text-sm">Assistant IA (Claude)</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAIDraft}
                      disabled={aiLoading}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      data-testid="ai-draft-quote-btn"
                    >
                      {aiLoading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Génération...</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Générer avec IA</>}
                    </Button>
                  </div>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={2}
                    placeholder="Optionnel : ajoutez des précisions (ex. : peinture 2 couches, 3 chambres, plafond inclus). Laissez vide pour utiliser uniquement les infos du lead."
                    className="bg-white border-purple-200 text-sm"
                    data-testid="ai-draft-prompt"
                  />
                  <p className="text-xs text-purple-700/70 mt-2">L&apos;IA pré-remplit les lignes à partir du lead et de votre prompt. Vérifiez toujours les prix avant d&apos;envoyer.</p>
                </div>

                {/* Lines */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">Lignes de soumission</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={openCatalog} data-testid="quote-catalog-btn" className="border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10">
                        <Package className="h-4 w-4 mr-1" />
                        Catalogue
                      </Button>
                      <Button variant="outline" size="sm" onClick={addQuoteLine} data-testid="add-quote-line-btn">
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {quoteLines.map((line, idx) => (
                      <div key={idx} className="p-4 border rounded-lg bg-gray-50" data-testid={`quote-line-${idx}`}>
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-12 md:col-span-5">
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={line.description}
                              onChange={(e) => updateQuoteLine(idx, 'description', e.target.value)}
                              placeholder="Description"
                              data-testid={`quote-line-desc-${idx}`}
                            />
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <Label className="text-xs">Type</Label>
                            <Select 
                              value={line.line_type}
                              onValueChange={(v) => updateQuoteLine(idx, 'line_type', v)}
                            >
                              <SelectTrigger data-testid={`quote-line-type-${idx}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="labor">Main-d'œuvre</SelectItem>
                                <SelectItem value="material">Matériel</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <Label className="text-xs">Qté</Label>
                            <Input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => updateQuoteLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                              data-testid={`quote-line-qty-${idx}`}
                            />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <Label className="text-xs">Prix unit.</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unit_price}
                              onChange={(e) => updateQuoteLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                              data-testid={`quote-line-price-${idx}`}
                            />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <Label className="text-xs">Prix marché</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.market_price}
                              onChange={(e) => updateQuoteLine(idx, 'market_price', parseFloat(e.target.value) || 0)}
                              placeholder="Optionnel"
                              data-testid={`quote-line-market-${idx}`}
                            />
                          </div>
                        </div>
                        {quoteLines.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-red-500 hover:text-red-700"
                            onClick={() => removeQuoteLine(idx)}
                            data-testid={`remove-quote-line-${idx}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Fees */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Frais de livraison ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                      data-testid="quote-delivery-fee"
                    />
                  </div>
                  <div>
                    <Label>Frais d'urgence ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={urgencyFee}
                      onChange={(e) => setUrgencyFee(parseFloat(e.target.value) || 0)}
                      data-testid="quote-urgency-fee"
                    />
                  </div>
                  <div>
                    <Label>Imprévu (%)</Label>
                    <Input
                      type="number"
                      min="10"
                      max="20"
                      value={contingencyPercent}
                      onChange={(e) => setContingencyPercent(Math.min(20, Math.max(10, parseFloat(e.target.value) || 15)))}
                      data-testid="quote-contingency"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label>Notes sur la soumission</Label>
                  <Textarea
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    rows={3}
                    placeholder="Notes additionnelles..."
                    data-testid="quote-notes"
                  />
                </div>

                <Separator />

                {/* Totals Preview */}
                <div className="bg-[#1a365d]/5 rounded-lg p-6" data-testid="quote-totals-preview">
                  <h4 className="font-semibold text-[#1a365d] mb-4">Aperçu des totaux</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Sous-total main-d'œuvre:</span>
                      <span>{formatCurrency(totals.subtotalLabor)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sous-total matériel:</span>
                      <span>{formatCurrency(totals.subtotalMaterial)}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span>Livraison:</span>
                        <span>{formatCurrency(deliveryFee)}</span>
                      </div>
                    )}
                    {urgencyFee > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Urgence:</span>
                        <span>{formatCurrency(urgencyFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium border-t pt-2 mt-2">
                      <span>Sous-total:</span>
                      <span>{formatCurrency(totals.subtotalBeforeContingency)}</span>
                    </div>
                    <div className="flex justify-between text-[#d4af37]">
                      <span>Imprévu ({contingencyPercent}%):</span>
                      <span>{formatCurrency(totals.contingencyAmount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                      <span>Total avant taxes:</span>
                      <span>{formatCurrency(totals.subtotalBeforeTax)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>TPS (5%):</span>
                      <span>{formatCurrency(totals.tps)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>TVQ (9.975%):</span>
                      <span>{formatCurrency(totals.tvq)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-[#1a365d] border-t-2 pt-3 mt-3">
                      <span>TOTAL:</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                    {totals.savings > 0 && (
                      <div className="flex justify-between text-green-600 bg-green-50 p-2 rounded mt-3">
                        <span>Économies vs marché:</span>
                        <span className="font-bold">{formatCurrency(totals.savings)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  className="btn-accent w-full" 
                  onClick={handleCreateQuote}
                  disabled={creatingQuote || quoteLines.every(l => !l.description)}
                  data-testid="create-quote-btn"
                >
                  {creatingQuote ? 'Création...' : 'Créer la soumission'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Actions */}
          <Card data-testid="lead-status-card">
            <CardHeader>
              <CardTitle>Statut</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Statut actuel</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-testid="lead-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes internes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Notes privées..."
                  data-testid="lead-notes-textarea"
                />
              </div>

              <Button 
                className="btn-primary w-full" 
                onClick={handleUpdateLead}
                disabled={saving}
                data-testid="save-lead-btn"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </CardContent>
          </Card>

          {/* Meta Info */}
          <Card data-testid="lead-meta-card">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Service:</span>
                <span className="font-medium">{getServiceLabel(lead.service_type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Urgence:</span>
                <span className={`font-medium ${lead.urgency_level === 'urgent' ? 'text-red-600' : ''}`}>
                  {getUrgencyLabel(lead.urgency_level)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Source:</span>
                <span className="font-medium">{getSourceLabel(lead.source)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Créé le:</span>
                <span className="font-medium">{formatDate(lead.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Service catalog picker for quote lines */}
      <InvoiceCatalogDialog
        open={showCatalog}
        onOpenChange={setShowCatalog}
        services={filteredCatalog}
        search={catalogSearch}
        onSearchChange={setCatalogSearch}
        onPick={addFromCatalog}
      />
    </div>
  );
}
