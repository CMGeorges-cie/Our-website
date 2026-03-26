import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/api';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Send, 
  User, 
  Calendar,
  Receipt,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL?.replace(/\/api\/v1\/?$/, '');

export default function AdminInvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const invoiceRes = await adminApi.getInvoice(id);
        setInvoice(invoiceRes.data);
        
        if (invoiceRes.data.client_id) {
          const clientRes = await adminApi.getClient(invoiceRes.data.client_id);
          setClient(clientRes.data);
        }
      } catch (error) {
        console.error('Error fetching invoice:', error);
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const downloadPdf = () => {
    window.open(`${BACKEND_URL}/api/v1/admin/invoices/${id}/pdf`, '_blank');
  };

  const printPdf = () => {
    const printWindow = window.open(`${BACKEND_URL}/api/v1/admin/invoices/${id}/pdf`, '_blank');
    printWindow.onload = () => printWindow.print();
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'partial': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'sent': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Facture non trouvée</p>
        <Button onClick={() => navigate('/admin/invoices')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux factures
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="invoice-detail-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/admin/invoices">
            <Button variant="outline" size="sm" className="border-gray-700 hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Facture {invoice.invoice_number}</h1>
            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusClass(invoice.status)}`}>
              {invoice.status === 'paid' ? 'Payée' : invoice.status === 'overdue' ? 'En retard' : invoice.status === 'partial' ? 'Partielle' : invoice.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadPdf} variant="outline" className="border-gray-700 hover:bg-gray-800 text-white">
            <Download className="h-4 w-4 mr-2" />
            Télécharger PDF
          </Button>
          <Button onClick={printPdf} variant="outline" className="border-gray-700 hover:bg-gray-800 text-white">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          <Button className="bg-gold-500 hover:bg-gold-600 text-black">
            <Send className="h-4 w-4 mr-2" />
            Envoyer
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Client</p>
                <p className="text-white font-medium">{client?.full_name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-white font-medium">{formatDateShort(invoice.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <Receipt className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-gold-500 font-bold text-xl">{formatCurrency(invoice.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Details */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Détails de la facture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Qté</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Prix unit.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lines || []).map((line, idx) => (
                  <tr key={idx} className="border-b border-gray-800">
                    <td className="px-4 py-4 text-white">{line.description}</td>
                    <td className="px-4 py-4 text-right text-gray-400">{line.quantity}</td>
                    <td className="px-4 py-4 text-right text-gray-400">{formatCurrency(line.unit_price)}</td>
                    <td className="px-4 py-4 text-right text-gold-500 font-medium">{formatCurrency(line.line_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700">
                  <td colSpan="3" className="px-4 py-3 text-right text-gray-400">Sous-total</td>
                  <td className="px-4 py-3 text-right text-white">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan="3" className="px-4 py-2 text-right text-gray-400">TPS (5%)</td>
                  <td className="px-4 py-2 text-right text-white">{formatCurrency(invoice.tps_amount)}</td>
                </tr>
                <tr>
                  <td colSpan="3" className="px-4 py-2 text-right text-gray-400">TVQ (9.975%)</td>
                  <td className="px-4 py-2 text-right text-white">{formatCurrency(invoice.tvq_amount)}</td>
                </tr>
                <tr className="border-t border-gold-500/50">
                  <td colSpan="3" className="px-4 py-4 text-right text-white font-bold text-lg">TOTAL</td>
                  <td className="px-4 py-4 text-right text-gold-500 font-bold text-xl">{formatCurrency(invoice.total)}</td>
                </tr>
                {invoice.balance_due > 0 && (
                  <tr>
                    <td colSpan="3" className="px-4 py-2 text-right text-red-400 font-medium">Solde dû</td>
                    <td className="px-4 py-2 text-right text-red-400 font-bold">{formatCurrency(invoice.balance_due)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payments History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Historique des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoice.payments.map((payment, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-white">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-gray-500">{formatDateShort(payment.date)} - {payment.method}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
