import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/api';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import { ClientChannelsCard } from '@/components/admin/ClientChannelsCard';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building,
  FileText,
  Receipt,
  Briefcase,
  Download,
  Send,
  Printer,
  ExternalLink
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientRes, quotesRes, invoicesRes, projectsRes] = await Promise.all([
          adminApi.getClient(id),
          adminApi.getQuotes({ client_id: id }),
          adminApi.getInvoices({ client_id: id }),
          adminApi.getProjects({ client_id: id })
        ]);
        setClient(clientRes.data);
        setQuotes(quotesRes.data || []);
        setInvoices(invoicesRes.data || []);
        setProjects(projectsRes.data || []);
      } catch (error) {
        console.error('Error fetching client:', error);
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSendPortalAccess = async () => {
    try {
      await adminApi.createPortalAccess(id);
      toast.success('Accès portail envoyé par courriel');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const downloadPdf = async (type, docId) => {
    const token = localStorage.getItem('token');
    window.open(`${BACKEND_URL}/api/v1/admin/${type}/${docId}/pdf`, '_blank');
  };

  const printPdf = async (type, docId) => {
    const token = localStorage.getItem('token');
    const url = `${BACKEND_URL}/api/v1/admin/${type}/${docId}/pdf`;
    const printWindow = window.open(url, '_blank');
    printWindow.onload = () => {
      printWindow.print();
    };
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

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Client non trouvé</p>
        <Button onClick={() => navigate('/admin/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux clients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="client-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/clients">
            <Button variant="outline" size="sm" className="border-gray-700 hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{client.full_name}</h1>
            {client.company_name && (
              <p className="text-gray-400">{client.company_name}</p>
            )}
          </div>
        </div>
        <Button onClick={handleSendPortalAccess} className="bg-gold-500 hover:bg-gold-600 text-black">
          <ExternalLink className="h-4 w-4 mr-2" />
          Envoyer accès portail
        </Button>
      </div>

      {/* Client Info Card */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Courriel</p>
                <p className="text-white">{client.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <Phone className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Téléphone</p>
                <p className="text-white">{client.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Adresse</p>
                <p className="text-white">{client.address || '-'}, {client.city || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <Building className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Statut</p>
                <p className="text-white capitalize">{client.status}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Soumissions</p>
                <p className="text-2xl font-bold text-white">{quotes.length}</p>
              </div>
              <FileText className="h-8 w-8 text-gold-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Factures</p>
                <p className="text-2xl font-bold text-white">{invoices.length}</p>
              </div>
              <Receipt className="h-8 w-8 text-gold-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Projets</p>
                <p className="text-2xl font-bold text-white">{projects.length}</p>
              </div>
              <Briefcase className="h-8 w-8 text-gold-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <ClientChannelsCard client={client} onSaved={setClient} />

      {/* Quotes Section */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-gold-500" />
            Soumissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune soumission</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-gray-300">{formatDateShort(quote.created_at)}</td>
                      <td className="px-4 py-3 text-gray-300 capitalize">{quote.service_type}</td>
                      <td className="px-4 py-3 text-right text-gold-500 font-semibold">{formatCurrency(quote.total_with_tax)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => downloadPdf('quotes', quote.id)} className="border-gray-700 hover:bg-gray-800">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => printPdf('quotes', quote.id)} className="border-gray-700 hover:bg-gray-800">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Section */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gold-500" />
            Factures
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune facture</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Numéro</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-gold-500 font-medium">{invoice.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-300">{formatDateShort(invoice.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                          invoice.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gold-500 font-semibold">{formatCurrency(invoice.total)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => downloadPdf('invoices', invoice.id)} className="border-gray-700 hover:bg-gray-800">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => printPdf('invoices', invoice.id)} className="border-gray-700 hover:bg-gray-800">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-gray-700 hover:bg-gray-800">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects Section */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-gold-500" />
            Projets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun projet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Projet</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{project.title}</p>
                        <p className="text-xs text-gray-500">{project.description}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-300 capitalize">{project.service_type}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          project.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{formatDateShort(project.scheduled_date || project.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
