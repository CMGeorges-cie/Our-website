import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi } from '@/lib/api';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import { Eye, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';

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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'partial': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
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

  // Calculate totals
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
          <h1 className="text-2xl font-bold text-[#1a365d] font-['Outfit']">Factures</h1>
          <p className="text-gray-500">Gérez vos factures et paiements</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <p className="text-sm text-gray-500 mb-1">Total factures</p>
          <p className="text-2xl font-bold text-[#1a365d]">{invoices.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500 mb-1">En attente</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500 mb-1">Payé ce mois</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </Card>
      </div>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]" data-testid="invoices-status-filter">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card data-testid="invoices-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
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
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      data-testid={`invoice-row-${invoice.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(invoice.status)}
                          <span className="font-medium text-[#1a365d]">
                            {invoice.invoice_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {invoice.client_id?.slice(0, 8) || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDateShort(invoice.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(invoice.status)}`}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={invoice.balance_due > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                          {formatCurrency(invoice.balance_due)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/admin/invoices/${invoice.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                        </Link>
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
