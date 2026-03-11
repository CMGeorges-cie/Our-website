import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Eye, Plus, Trash2, Download, Printer, Send } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyée' },
  { value: 'paid', label: 'Payée' },
  { value: 'partial', label: 'Partielle' },
  { value: 'overdue', label: 'En retard' },
];

const getStatusClass = (status) => {
  const c = { draft: 'bg-gray-500/20 text-gray-400 border border-gray-500/30', sent: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', paid: 'bg-green-500/20 text-green-400 border border-green-500/30', partial: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', overdue: 'bg-red-500/20 text-red-400 border border-red-500/30' };
  return c[status] || 'bg-gray-500/20 text-gray-400';
};
const getStatusLabel = (status) => {
  const l = { draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', partial: 'Partielle', overdue: 'En retard', cancelled: 'Annulée' };
  return l[status] || status;
};

const emptyLine = { description: '', quantity: 1, unit_price: 0, line_type: 'service' };

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [form, setForm] = useState({ client_id: '', notes: '', payment_terms: 'Net 30', lines: [{ ...emptyLine }] });

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
  }, []);

  const downloadPdf = (id) => window.open(`${BACKEND_URL}/api/v1/admin/invoices/${id}/pdf`, '_blank');
  const printPdf = (id) => { const w = window.open(`${BACKEND_URL}/api/v1/admin/invoices/${id}/pdf`, '_blank'); w.onload = () => w.print(); };

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
      await adminApi.createInvoice({ ...form, lines: form.lines.map(l => ({ ...l, quantity: parseInt(l.quantity), unit_price: parseFloat(l.unit_price) })) });
      toast.success('Facture créée');
      setShowCreate(false);
      setForm({ client_id: '', notes: '', payment_terms: 'Net 30', lines: [{ ...emptyLine }] });
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

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { ...emptyLine }] }));
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i, field, value) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));

  const totalPending = invoices.filter(i => ['sent', 'partial'].includes(i.status)).reduce((s, i) => s + (i.balance_due || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  return (
    <div data-testid="admin-invoices">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Factures</h1>
          <p className="text-gray-500">Gérez vos factures et paiements</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-gold-500 hover:bg-gold-600 text-black font-semibold" data-testid="new-invoice-btn">
          <Plus className="h-4 w-4 mr-2" />Nouvelle facture
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gray-900 border-gray-800 p-6"><p className="text-sm text-gray-500 mb-1">Total factures</p><p className="text-2xl font-bold text-white">{invoices.length}</p></Card>
        <Card className="bg-gray-900 border-gray-800 p-6"><p className="text-sm text-gray-500 mb-1">En attente</p><p className="text-2xl font-bold text-yellow-400">{formatCurrency(totalPending)}</p></Card>
        <Card className="bg-gray-900 border-gray-800 p-6"><p className="text-sm text-gray-500 mb-1">Payé (total)</p><p className="text-2xl font-bold text-green-400">{formatCurrency(totalPaid)}</p></Card>
      </div>

      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px] bg-gray-800 border-gray-700 text-white" data-testid="invoices-status-filter">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-gray-700">{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800" data-testid="invoices-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Facture</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Solde</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>Chargement...
                  </td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Aucune facture trouvée</td></tr>
                ) : invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors" data-testid={`invoice-row-${invoice.id}`}>
                    <td className="px-6 py-4"><span className="font-medium text-gold-500">{invoice.invoice_number}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-400">{formatDateShort(invoice.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(invoice.status)}`}>{getStatusLabel(invoice.status)}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(invoice.total)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={invoice.balance_due > 0 ? 'text-red-400 font-medium' : 'text-green-400'}>{formatCurrency(invoice.balance_due)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={`/admin/invoices/${invoice.id}`}>
                          <Button variant="outline" size="sm" className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10" data-testid={`view-invoice-${invoice.id}`}><Eye className="h-4 w-4" /></Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => downloadPdf(invoice.id)} className="border-gray-700 text-gray-400 hover:bg-gray-800"><Download className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => printPdf(invoice.id)} className="border-gray-700 text-gray-400 hover:bg-gray-800"><Printer className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => sendEmail(invoice)} disabled={sendingId === invoice.id} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10" data-testid={`send-invoice-${invoice.id}`}>
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedInvoice(invoice); setShowDelete(true); }} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid={`delete-invoice-${invoice.id}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Invoice Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-gold-500">Nouvelle facture</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400">Client *</Label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({...f, client_id: v}))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1" data-testid="invoice-client-select">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {clients.map(c => <SelectItem key={c.id} value={c.id} className="text-white hover:bg-gray-700">{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-400">Modalités de paiement</Label>
              <Select value={form.payment_terms} onValueChange={v => setForm(f => ({...f, payment_terms: v}))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {['Net 30', 'Net 15', 'À réception', 'Sur dépôt'].map(t => <SelectItem key={t} value={t} className="text-white hover:bg-gray-700">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400">Lignes *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine} className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10"><Plus className="h-3 w-3 mr-1" />Ajouter</Button>
              </div>
              <div className="space-y-2">
                {form.lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" className="col-span-5 bg-gray-800 border-gray-700 text-white text-sm" />
                    <Input type="number" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} className="col-span-2 bg-gray-800 border-gray-700 text-white text-sm" placeholder="Qté" />
                    <Input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)} className="col-span-3 bg-gray-800 border-gray-700 text-white text-sm" placeholder="Prix" />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeLine(i)} className="col-span-2 border-red-500/30 text-red-400 hover:bg-red-500/10 px-2"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-gray-400">Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="create-invoice-submit">
              {saving ? 'Création...' : 'Créer la facture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-red-400">Supprimer la facture</DialogTitle></DialogHeader>
          <p className="text-gray-400">Supprimer la facture <strong className="text-white">{selectedInvoice?.invoice_number}</strong> ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-invoice">
              {saving ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
