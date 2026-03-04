import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { Eye, FileText, Download, Printer, Send, Plus, Trash2, Receipt } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyée' },
  { value: 'paid', label: 'Payée' },
  { value: 'partial', label: 'Partielle' },
  { value: 'overdue', label: 'En retard' },
];

const emptyLine = { description: '', quantity: 1, unit_price: 0 };

export default function AdminInvoices() {
  usePageTitle('Gestion des Factures');
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    lines: [{ ...emptyLine }],
    notes: '',
    due_date: '',
    payment_terms: 'Net 30'
  });

  const fetchData = async () => {
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const [invoicesRes, clientsRes] = await Promise.all([
        adminApi.getInvoices(params),
        adminApi.getClients()
      ]);
      setInvoices(invoicesRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleCreate = () => {
    setFormData({
      client_id: '',
      lines: [{ ...emptyLine }],
      notes: '',
      due_date: '',
      payment_terms: 'Net 30'
    });
    setShowModal(true);
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { ...emptyLine }]
    });
  };

  const updateLine = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const removeLine = (index) => {
    if (formData.lines.length > 1) {
      setFormData({
        ...formData,
        lines: formData.lines.filter((_, i) => i !== index)
      });
    }
  };

  const handleSave = async () => {
    if (!formData.client_id) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    const validLines = formData.lines.filter(l => l.description && l.unit_price > 0);
    if (validLines.length === 0) {
      toast.error('Veuillez ajouter au moins une ligne');
      return;
    }

    setSaving(true);
    try {
      await adminApi.createInvoice({
        client_id: formData.client_id,
        lines: validLines,
        notes: formData.notes,
        due_date: formData.due_date || null,
        payment_terms: formData.payment_terms
      });
      toast.success('Facture créée');
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (invoiceId) => {
    if (!confirm('Supprimer cette facture?')) return;
    
    try {
      await adminApi.deleteInvoice(invoiceId);
      toast.success('Facture supprimée');
      fetchData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const downloadPdf = (invoiceId) => {
    window.open(`${BACKEND_URL}/api/v1/admin/invoices/${invoiceId}/pdf`, '_blank');
  };

  const printPdf = (invoiceId) => {
    const printWindow = window.open(`${BACKEND_URL}/api/v1/admin/invoices/${invoiceId}/pdf`, '_blank');
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      draft: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
      sent: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      paid: 'bg-green-500/20 text-green-400 border border-green-500/30',
      partial: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      overdue: 'bg-red-500/20 text-red-400 border border-red-500/30',
      cancelled: 'bg-gray-500/20 text-gray-500 border border-gray-500/30',
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
      cancelled: 'Annulée',
    };
    return labels[status] || status;
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || 'Client inconnu';
  };

  const calculateTotal = () => {
    const subtotal = formData.lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
    const tps = subtotal * 0.05;
    const tvq = subtotal * 0.09975;
    return { subtotal, tps, tvq, total: subtotal + tps + tvq };
  };

  const totalPending = invoices
    .filter(i => ['sent', 'partial'].includes(i.status))
    .reduce((sum, i) => sum + (i.balance_due || 0), 0);
  
  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div data-testid="admin-invoices">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Factures</h1>
          <p className="text-gray-500">Gérez vos factures et paiements</p>
        </div>
        <Button 
          className="bg-gold-500 hover:bg-gold-600 text-black font-semibold"
          onClick={handleCreate}
          data-testid="create-invoice-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle facture
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gray-900 border-gray-800 p-6">
          <p className="text-sm text-gray-500 mb-1">Total factures</p>
          <p className="text-2xl font-bold text-white">{invoices.length}</p>
        </Card>
        <Card className="bg-gray-900 border-gray-800 p-6">
          <p className="text-sm text-gray-500 mb-1">En attente</p>
          <p className="text-2xl font-bold text-yellow-400">{formatCurrency(totalPending)}</p>
        </Card>
        <Card className="bg-gray-900 border-gray-800 p-6">
          <p className="text-sm text-gray-500 mb-1">Payé ce mois</p>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(totalPaid)}</p>
        </Card>
      </div>

      {/* Filter */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px] bg-gray-800 border-gray-700 text-white" data-testid="invoices-status-filter">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-gray-700">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="bg-gray-900 border-gray-800" data-testid="invoices-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Facture</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Solde</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      Chargement...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      Aucune facture trouvée
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr 
                      key={invoice.id} 
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                      data-testid={`invoice-row-${invoice.id}`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-gold-500">
                          {invoice.invoice_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {getClientName(invoice.client_id)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDateShort(invoice.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(invoice.status)}`}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-white">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={invoice.balance_due > 0 ? 'text-red-400 font-medium' : 'text-green-400'}>
                          {formatCurrency(invoice.balance_due)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/invoices/${invoice.id}`}>
                            <Button variant="outline" size="sm" className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm" onClick={() => downloadPdf(invoice.id)} className="border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => printPdf(invoice.id)} className="border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                            onClick={() => handleDelete(invoice.id)}
                            data-testid={`delete-invoice-${invoice.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Nouvelle facture
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Client *</Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={(v) => setFormData({...formData, client_id: v})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-client">
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Date d'échéance</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-due-date"
                />
              </div>
            </div>

            {/* Lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Lignes de facture</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addLine}
                  className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10"
                >
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>
              
              {formData.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end bg-gray-800/50 p-3 rounded-lg">
                  <div className="col-span-5">
                    <Label className="text-xs text-gray-500">Description</Label>
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                      placeholder="Service..."
                      className="bg-gray-800 border-gray-700 text-white text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">Qté</Label>
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="bg-gray-800 border-gray-700 text-white text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs text-gray-500">Prix unit. ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="bg-gray-800 border-gray-700 text-white text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span className="text-gold-500 font-medium text-sm">
                      {formatCurrency(line.quantity * line.unit_price)}
                    </span>
                    {formData.lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1 h-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-gray-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Sous-total</span>
                <span className="text-white">{formatCurrency(calculateTotal().subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">TPS (5%)</span>
                <span className="text-white">{formatCurrency(calculateTotal().tps)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">TVQ (9.975%)</span>
                <span className="text-white">{formatCurrency(calculateTotal().tvq)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-700 pt-2 mt-2">
                <span className="text-white">Total</span>
                <span className="text-gold-500">{formatCurrency(calculateTotal().total)}</span>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Notes sur la facture..."
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="input-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowModal(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-gold-500 hover:bg-gold-600 text-black font-semibold"
              data-testid="save-invoice-btn"
            >
              {saving ? 'Création...' : 'Créer la facture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
