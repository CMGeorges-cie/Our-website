import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi } from '@/lib/api';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import { Eye, FileText, AlertCircle, CheckCircle, Clock, Download, Printer, Send } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyée' },
  { value: 'paid', label: 'Payée' },
  { value: 'partial', label: 'Partielle' },
  { value: 'overdue', label: 'En retard' },
];

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const params = {};
        if (statusFilter && statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const response = await adminApi.getInvoices(params);
        setInvoices(response.data);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [statusFilter]);

  const downloadPdf = (invoiceId) => {
    window.open(`${BACKEND_URL}/api/v1/admin/invoices/${invoiceId}/pdf`, '_blank');
  };

  const printPdf = (invoiceId) => {
    const printWindow = window.open(`${BACKEND_URL}/api/v1/admin/invoices/${invoiceId}/pdf`, '_blank');
    printWindow.onload = () => printWindow.print();
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
                        {invoice.client_id?.slice(0, 8) || '-'}
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
                          <Button variant="outline" size="sm" onClick={() => downloadPdf(invoice.id)} className="border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => printPdf(invoice.id)} className="border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white">
                            <Send className="h-4 w-4" />
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
    </div>
  );
}
