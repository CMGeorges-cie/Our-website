import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminApi, apiV2, aiApi } from '@/lib/api';
import InvoiceCatalogDialog from '@/components/admin/invoices/InvoiceCatalogDialog';
import ConvertQuoteDialog from '@/components/admin/invoices/ConvertQuoteDialog';
import DeleteInvoiceDialog from '@/components/admin/invoices/DeleteInvoiceDialog';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Eye, Plus, Trash2, Download, Printer, Send, Search, 
  Package, DollarSign, Percent, FileText, User, Calendar,
  CheckCircle, Clock, AlertCircle, X, Copy, ArrowRight, Sparkles, Loader2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyée' },
  { value: 'paid', label: 'Payée' },
  { value: 'partial', label: 'Partielle' },
  { value: 'overdue', label: 'En retard' },
];

const paymentTermsOptions = [
  { value: 'immediate', label: 'Paiement immédiat' },
  { value: 'net15', label: 'Net 15 jours' },
  { value: 'net30', label: 'Net 30 jours' },
  { value: 'deposit', label: 'Acompte 50%' },
  { value: 'custom', label: 'Personnalisé' },
];

const getStatusClass = (status) => {
  const classes = {
    draft: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
    sent: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    paid: 'bg-green-500/20 text-green-400 border border-green-500/30',
    partial: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    overdue: 'bg-red-500/20 text-red-400 border border-red-500/30',
    cancelled: 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
  };
  return classes[status] || 'bg-gray-500/20 text-gray-400';
};

const getStatusLabel = (status) => {
  const labels = {
    draft: 'Brouillon',
    sent: 'Envoyée',
    paid: 'Payée',
    partial: 'Partielle',
    overdue: 'En retard',
    cancelled: 'Annulée'
  };
  return labels[status] || status;
};

const getStatusIcon = (status) => {
  switch(status) {
    case 'paid': return <CheckCircle className="h-4 w-4 text-green-400" />;
    case 'overdue': return <AlertCircle className="h-4 w-4 text-red-400" />;
    case 'sent': return <Send className="h-4 w-4 text-blue-400" />;
    case 'partial': return <Clock className="h-4 w-4 text-yellow-400" />;
    default: return <FileText className="h-4 w-4 text-gray-400" />;
  }
};

const emptyLine = { 
  description: '', 
  quantity: 1, 
  unit_price: 0, 
  line_type: 'service',
  catalog_id: null 
};

export default function AdminInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [catalogServices, setCatalogServices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showConvertQuote, setShowConvertQuote] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [activeTab, setActiveTab] = useState('manual');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    client_id: '',
    notes: '',
    payment_terms: 'net30',
    custom_terms: '',
    discount_type: 'none',
    discount_value: 0,
    deposit_required: false,
    deposit_percent: 50,
    due_date: '',
    lines: [{ ...emptyLine }]
  });

  // Fetch data
  const fetchInvoices = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const response = await adminApi.getInvoices(params);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  
  useEffect(() => {
    adminApi.getClients().then(r => setClients(r.data || [])).catch(() => {});
    adminApi.getQuotes().then(r => setQuotes(r.data || [])).catch(() => {});
    apiV2.get('/catalog').then(r => setCatalogServices(r.data || [])).catch(() => {});
  }, []);

  // Calculations
  const calculateSubtotal = () => {
    return form.lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (form.discount_type === 'percent') {
      return subtotal * (form.discount_value / 100);
    } else if (form.discount_type === 'fixed') {
      return form.discount_value;
    }
    return 0;
  };

  const calculateTaxes = () => {
    const afterDiscount = calculateSubtotal() - calculateDiscount();
    const tps = afterDiscount * 0.05;
    const tvq = afterDiscount * 0.09975;
    return { tps, tvq, total: tps + tvq };
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const taxes = calculateTaxes();
    return subtotal - discount + taxes.total;
  };

  const calculateDeposit = () => {
    if (form.deposit_required) {
      return calculateTotal() * (form.deposit_percent / 100);
    }
    return 0;
  };

  // Actions
  const downloadPdf = (id) => window.open(`${BACKEND_URL}/api/v1/admin/invoices/${id}/pdf`, '_blank');
  const printPdf = (id) => { 
    const w = window.open(`${BACKEND_URL}/api/v1/admin/invoices/${id}/pdf`, '_blank'); 
    if (w) w.onload = () => w.print(); 
  };

  const sendEmail = async (invoice) => {
    if (!invoice.client_id) { toast.error('Pas de client associé'); return; }
    setSendingId(invoice.id);
    try {
      const res = await adminApi.sendInvoiceByEmail(invoice.id);
      toast.success(res.data.message || 'Facture envoyée!');
      fetchInvoices();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur d\'envoi');
    } finally { setSendingId(null); }
  };

  const handleCreate = async () => {
    if (!form.client_id) { toast.error('Sélectionnez un client'); return; }
    if (!form.lines.length || !form.lines[0].description) { toast.error('Ajoutez au moins une ligne'); return; }
    
    setSaving(true);
    try {
      const payload = {
        client_id: form.client_id,
        notes: form.notes,
        payment_terms: form.payment_terms === 'custom' ? form.custom_terms : form.payment_terms,
        due_date: form.due_date || null,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value) || 0,
        deposit_amount: form.deposit_required ? calculateDeposit() : 0,
        lines: form.lines.map(l => ({
          description: l.description,
          quantity: parseInt(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          line_type: l.line_type
        }))
      };
      
      await adminApi.createInvoice(payload);
      toast.success('Facture créée avec succès!');
      setShowCreate(false);
      resetForm();
      fetchInvoices();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await adminApi.deleteInvoice(selectedInvoice.id);
      toast.success('Facture supprimée');
      setShowDelete(false);
      fetchInvoices();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    } finally { setSaving(false); }
  };

  const convertQuoteToInvoice = async (quote) => {
    try {
      // Pre-fill form with quote data
      setForm({
        ...form,
        client_id: quote.client_id,
        notes: `Ref. Devis: ${quote.quote_number || quote.id}`,
        lines: (quote.lines || quote.items || []).map(item => ({
          description: item.description || item.name,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || item.price || 0,
          line_type: 'service',
          catalog_id: null
        }))
      });
      setShowConvertQuote(false);
      setShowCreate(true);
      toast.success('Devis importé! Vérifiez et créez la facture.');
    } catch (e) {
      toast.error('Erreur lors de l\'import du devis');
    }
  };

  // Line management
  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { ...emptyLine }] }));
  const handleAIInvoiceDraft = async () => {
    if (!form.client_id) { toast.error('Sélectionnez un client avant'); return; }
    setAiLoading(true);
    try {
      const res = await aiApi.draftInvoice({
        client_id: form.client_id || null,
        prompt: aiPrompt || null,
      });
      const draft = res.data;
      if (draft.lines && draft.lines.length > 0) {
        setForm(f => ({
          ...f,
          lines: draft.lines.map(l => ({
            description: l.description || '',
            quantity: l.quantity || 1,
            unit_price: l.unit_price || 0,
            line_type: l.line_type === 'material' ? 'material' : 'service',
            catalog_id: null,
          })),
          notes: draft.notes || f.notes,
          payment_terms: draft.payment_terms === 'Net 15' ? 'net15' : draft.payment_terms === 'Net 30' ? 'net30' : f.payment_terms,
        }));
      }
      toast.success("Brouillon généré par Claude. Vérifiez avant d'enregistrer.");
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Erreur lors de la génération IA');
    } finally {
      setAiLoading(false);
    }
  };
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i, field, value) => setForm(f => ({ 
    ...f, 
    lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) 
  }));

  const addFromCatalog = (service) => {
    const newLine = {
      description: service.name,
      quantity: 1,
      unit_price: service.base_price,
      line_type: 'service',
      catalog_id: service.id
    };
    setForm(f => ({ ...f, lines: [...f.lines.filter(l => l.description), newLine] }));
    setShowCatalog(false);
    toast.success(`"${service.name}" ajouté`);
  };

  const resetForm = () => {
    setForm({
      client_id: '',
      notes: '',
      payment_terms: 'net30',
      custom_terms: '',
      discount_type: 'none',
      discount_value: 0,
      deposit_required: false,
      deposit_percent: 50,
      due_date: '',
      lines: [{ ...emptyLine }]
    });
  };

  // Filtering
  const filteredInvoices = invoices.filter(inv => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const client = clients.find(c => c.id === inv.client_id);
      return inv.invoice_number?.toLowerCase().includes(search) ||
             client?.full_name?.toLowerCase().includes(search);
    }
    return true;
  });

  const filteredCatalog = catalogServices.filter(s => 
    s.name?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    s.category?.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const pendingQuotes = quotes.filter(q => q.status === 'accepted' || q.status === 'sent');

  // Stats
  const totalPending = invoices.filter(i => ['sent', 'partial'].includes(i.status)).reduce((s, i) => s + (i.balance_due || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  return (
    <div data-testid="admin-invoices-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Factures</h1>
          <p className="text-muted-foreground">Créez et gérez vos factures professionnelles</p>
        </div>
        <div className="flex gap-2">
          {pendingQuotes.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setShowConvertQuote(true)}
              className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10"
            >
              <Copy className="h-4 w-4 mr-2" />
              Depuis un devis ({pendingQuotes.length})
            </Button>
          )}
          <Button 
            onClick={() => { resetForm(); setShowCreate(true); }} 
            className="bg-gold-500 hover:bg-gold-600 text-background font-semibold"
            data-testid="new-invoice-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle facture
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total factures</p>
                <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
              </div>
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-gold-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">En attente</p>
                <p className="text-2xl font-bold text-yellow-400">{formatCurrency(totalPending)}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Payé</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">En retard</p>
                <p className="text-2xl font-bold text-red-400">{overdueCount}</p>
              </div>
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro ou client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-background" data-testid="invoices-status-filter">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="bg-card border-border" data-testid="invoices-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Facture</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Total</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Solde</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-muted-foreground">
                      <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      Chargement...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune facture trouvée</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => { resetForm(); setShowCreate(true); }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Créer une facture
                      </Button>
                    </td>
                  </tr>
                ) : filteredInvoices.map((invoice) => {
                  const client = clients.find(c => c.id === invoice.client_id);
                  return (
                    <tr 
                      key={invoice.id} 
                      className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                      data-testid={`invoice-row-${invoice.id}`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gold-500">{invoice.invoice_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gold-500/20 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gold-500" />
                          </div>
                          <span className="text-foreground">{client?.full_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDateShort(invoice.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(invoice.status)}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(invoice.status)}`}>
                            {getStatusLabel(invoice.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-foreground">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={invoice.balance_due > 0 ? 'text-red-400 font-medium' : 'text-green-400'}>
                          {formatCurrency(invoice.balance_due)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => downloadPdf(invoice.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => printPdf(invoice.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => sendEmail(invoice)} 
                            disabled={sendingId === invoice.id}
                            className="text-blue-400 hover:text-blue-300"
                            data-testid={`send-invoice-${invoice.id}`}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setSelectedInvoice(invoice); setShowDelete(true); }}
                            className="text-red-400 hover:text-red-300"
                            data-testid={`delete-invoice-${invoice.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Invoice Modal - Joist/Invoice Fly Style */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border text-foreground max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border sticky top-0 bg-card z-10">
            <DialogTitle className="text-xl font-bold text-gold-500 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Nouvelle facture
            </DialogTitle>
            <DialogDescription>
              Créez une facture professionnelle en quelques clics
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-6">
            {/* Client Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Client *</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({...f, client_id: v}))}>
                  <SelectTrigger className="mt-1.5 bg-background" data-testid="invoice-client-select">
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gold-500" />
                          {c.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Date d'échéance</Label>
                <Input 
                  type="date" 
                  value={form.due_date}
                  onChange={e => setForm(f => ({...f, due_date: e.target.value}))}
                  className="mt-1.5 bg-background"
                />
              </div>
            </div>

            {/* Lines Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Articles et services</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAIInvoiceDraft}
                    disabled={aiLoading || !form.client_id}
                    className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
                    data-testid="ai-draft-invoice-btn"
                  >
                    {aiLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> IA...</> : <><Sparkles className="h-4 w-4 mr-1" /> Générer avec IA</>}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCatalog(true)}
                    className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10"
                  >
                    <Package className="h-4 w-4 mr-1" />
                    Catalogue
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addLine}
                    className="border-border"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ligne
                  </Button>
                </div>
              </div>

              <div className="mb-3">
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={2}
                  placeholder="Optionnel — précisions pour l'IA (ex: peinture salon + cuisine, 2 couches, 4 portes, 8h). Sinon, le client suffit."
                  className="text-sm border-purple-500/20 bg-purple-500/5"
                  data-testid="ai-invoice-prompt"
                />
              </div>

              <div className="bg-background rounded-lg border border-border overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2 text-center">Qté</div>
                  <div className="col-span-2 text-right">Prix unit.</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Lines */}
                <div className="divide-y divide-border">
                  {form.lines.map((line, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                      <div className="col-span-5">
                        <Input 
                          value={line.description} 
                          onChange={e => updateLine(i, 'description', e.target.value)} 
                          placeholder="Description du service/produit" 
                          className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0 text-foreground"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input 
                          type="number" 
                          min="1"
                          value={line.quantity} 
                          onChange={e => updateLine(i, 'quantity', e.target.value)} 
                          className="bg-background text-center text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={line.unit_price} 
                            onChange={e => updateLine(i, 'unit_price', e.target.value)} 
                            className="bg-background text-right text-sm pl-6"
                          />
                        </div>
                      </div>
                      <div className="col-span-2 text-right font-medium text-gold-500">
                        {formatCurrency(line.quantity * line.unit_price)}
                      </div>
                      <div className="col-span-1 text-right">
                        {form.lines.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeLine(i)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Discount & Payment Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Discount */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Remise</Label>
                <div className="flex gap-2">
                  <Select 
                    value={form.discount_type} 
                    onValueChange={v => setForm(f => ({...f, discount_type: v, discount_value: 0}))}
                  >
                    <SelectTrigger className="w-36 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      <SelectItem value="percent">Pourcentage</SelectItem>
                      <SelectItem value="fixed">Montant fixe</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.discount_type !== 'none' && (
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        value={form.discount_value}
                        onChange={e => setForm(f => ({...f, discount_value: e.target.value}))}
                        className="bg-background pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {form.discount_type === 'percent' ? '%' : '$'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Terms */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Modalités de paiement</Label>
                <Select value={form.payment_terms} onValueChange={v => setForm(f => ({...f, payment_terms: v}))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTermsOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.payment_terms === 'custom' && (
                  <Input
                    value={form.custom_terms}
                    onChange={e => setForm(f => ({...f, custom_terms: e.target.value}))}
                    placeholder="Ex: 25% à la signature, solde à la livraison"
                    className="bg-background"
                  />
                )}
              </div>
            </div>

            {/* Deposit Option */}
            <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-gold-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Demander un acompte</p>
                  <p className="text-sm text-muted-foreground">Le client devra verser un acompte avant le début des travaux</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {form.deposit_required && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={form.deposit_percent}
                      onChange={e => setForm(f => ({...f, deposit_percent: e.target.value}))}
                      className="w-20 bg-card text-center"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                )}
                <Switch
                  checked={form.deposit_required}
                  onCheckedChange={v => setForm(f => ({...f, deposit_required: v}))}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium">Notes / Conditions</Label>
              <Textarea 
                value={form.notes} 
                onChange={e => setForm(f => ({...f, notes: e.target.value}))} 
                className="mt-1.5 bg-background"
                rows={3}
                placeholder="Conditions particulières, instructions de paiement..."
              />
            </div>

            {/* Summary */}
            <div className="bg-background rounded-lg border border-border p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="text-foreground">{formatCurrency(calculateSubtotal())}</span>
                </div>
                {form.discount_type !== 'none' && calculateDiscount() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">Remise</span>
                    <span className="text-green-400">-{formatCurrency(calculateDiscount())}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TPS (5%)</span>
                  <span className="text-foreground">{formatCurrency(calculateTaxes().tps)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TVQ (9.975%)</span>
                  <span className="text-foreground">{formatCurrency(calculateTaxes().tvq)}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-xl text-gold-500">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
                {form.deposit_required && (
                  <div className="flex justify-between text-sm pt-2 border-t border-border">
                    <span className="text-muted-foreground">Acompte requis ({form.deposit_percent}%)</span>
                    <span className="text-gold-500 font-medium">{formatCurrency(calculateDeposit())}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border sticky bottom-0 bg-card">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={saving} 
              className="bg-gold-500 hover:bg-gold-600 text-background"
              data-testid="create-invoice-submit"
            >
              {saving ? 'Création...' : 'Créer la facture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catalog Modal */}
      <InvoiceCatalogDialog
        open={showCatalog}
        onOpenChange={setShowCatalog}
        services={filteredCatalog}
        search={catalogSearch}
        onSearchChange={setCatalogSearch}
        onPick={addFromCatalog}
      />

      {/* Convert Quote Modal */}
      <ConvertQuoteDialog
        open={showConvertQuote}
        onOpenChange={setShowConvertQuote}
        pendingQuotes={pendingQuotes}
        clients={clients}
        onConvert={convertQuoteToInvoice}
      />

      {/* Delete Modal */}
      <DeleteInvoiceDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        invoice={selectedInvoice}
        onConfirm={handleDelete}
        saving={saving}
      />
    </div>
  );
}
