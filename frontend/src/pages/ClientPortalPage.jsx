import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/api';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import { 
  FileText, 
  Receipt, 
  Briefcase, 
  Download, 
  User,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ClientPortalPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [portalData, setPortalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('quotes');

  useEffect(() => {
    const fetchPortalData = async () => {
      if (!token) {
        setError('Lien d\'accès invalide. Veuillez demander un nouveau lien à Déco Touché.');
        setLoading(false);
        return;
      }

      try {
        // Old portal page - redirected to new client portal
        setPortalData({ client: { name: 'Client' }, projects: [], invoices: [] });
      } catch (err) {
        console.error('Portal error:', err);
        if (err.response?.status === 401) {
          setError('Votre lien d\'accès a expiré. Veuillez demander un nouveau lien à Déco Touché.');
        } else {
          setError('Erreur lors du chargement de vos données. Veuillez réessayer.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, [token]);

  const downloadPdf = (type, id) => {
    const url = `${BACKEND_URL}/api/v1/portal/${type}/${id}/pdf?token=${token}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (status, type) => {
    const configs = {
      quotes: {
        draft: { label: 'Brouillon', class: 'bg-gray-100 text-gray-800' },
        sent: { label: 'Envoyée', class: 'bg-blue-100 text-blue-800' },
        accepted: { label: 'Acceptée', class: 'bg-green-100 text-green-800' },
      },
      invoices: {
        draft: { label: 'Brouillon', class: 'bg-gray-100 text-gray-800' },
        sent: { label: 'Envoyée', class: 'bg-blue-100 text-blue-800' },
        paid: { label: 'Payée', class: 'bg-green-100 text-green-800', icon: CheckCircle },
        partial: { label: 'Partielle', class: 'bg-yellow-100 text-yellow-800', icon: Clock },
        overdue: { label: 'En retard', class: 'bg-red-100 text-red-800', icon: AlertCircle },
      },
      projects: {
        pending: { label: 'En attente', class: 'bg-gray-100 text-gray-800' },
        in_progress: { label: 'En cours', class: 'bg-blue-100 text-blue-800' },
        completed: { label: 'Complété', class: 'bg-green-100 text-green-800', icon: CheckCircle },
        on_hold: { label: 'En pause', class: 'bg-yellow-100 text-yellow-800' },
      }
    };

    const config = configs[type]?.[status] || { label: status, class: 'bg-gray-100 text-gray-800' };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.class}`}>
        {Icon && <Icon className="h-3 w-3" />}
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[#1a365d] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement de votre portail...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1a365d] mb-2">Accès refusé</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link to="/contact">
              <Button className="btn-primary">Contactez-nous</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { client, quotes, invoices, projects } = portalData;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="client-portal-page">
      <Helmet>
        <title>Portail Client | Déco Touché</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <header className="bg-[#1a365d] py-8">
        <div className="container-main">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#d4af37] rounded-lg flex items-center justify-center">
              <span className="text-[#1a365d] text-xl font-bold">🦁</span>
            </div>
            <span className="text-2xl font-bold text-white font-['Outfit']">Déco Touché</span>
          </div>
          <h1 className="text-xl text-white/90">Portail Client</h1>
        </div>
      </header>

      <section className="section-spacing">
        <div className="container-main">
          {/* Client Info */}
          <Card className="mb-8" data-testid="client-info-card">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#1a365d] rounded-full flex items-center justify-center">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#1a365d]">{client.full_name}</h2>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {client.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {client.phone}
                      </span>
                    </div>
                  </div>
                </div>
                {client.address && (
                  <div className="text-sm text-gray-500 flex items-start gap-1">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>{client.address}, {client.city}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4" data-testid="quotes-count">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-[#d4af37]" />
                <div>
                  <p className="text-2xl font-bold text-[#1a365d]">{quotes.length}</p>
                  <p className="text-sm text-gray-500">Soumission(s)</p>
                </div>
              </div>
            </Card>
            <Card className="p-4" data-testid="invoices-count">
              <div className="flex items-center gap-3">
                <Receipt className="h-8 w-8 text-[#d4af37]" />
                <div>
                  <p className="text-2xl font-bold text-[#1a365d]">{invoices.length}</p>
                  <p className="text-sm text-gray-500">Facture(s)</p>
                </div>
              </div>
            </Card>
            <Card className="p-4" data-testid="projects-count">
              <div className="flex items-center gap-3">
                <Briefcase className="h-8 w-8 text-[#d4af37]" />
                <div>
                  <p className="text-2xl font-bold text-[#1a365d]">{projects.length}</p>
                  <p className="text-sm text-gray-500">Projet(s)</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'quotes', label: 'Soumissions', icon: FileText },
              { id: 'invoices', label: 'Factures', icon: Receipt },
              { id: 'projects', label: 'Projets', icon: Briefcase },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'outline'}
                  className={activeTab === tab.id ? 'bg-[#1a365d]' : ''}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Content */}
          <Card data-testid={`${activeTab}-list`}>
            <CardContent className="p-0">
              {activeTab === 'quotes' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Référence</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                            Aucune soumission
                          </td>
                        </tr>
                      ) : (
                        quotes.map((quote) => (
                          <tr key={quote.id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm">{formatDateShort(quote.created_at)}</td>
                            <td className="px-6 py-4 text-sm font-medium text-[#1a365d]">{quote.id.slice(0, 8)}</td>
                            <td className="px-6 py-4 text-right font-semibold">{formatCurrency(quote.total_with_tax)}</td>
                            <td className="px-6 py-4 text-right">
                              <Button size="sm" variant="outline" onClick={() => downloadPdf('quote', quote.id)}>
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'invoices' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Numéro</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Solde</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                            Aucune facture
                          </td>
                        </tr>
                      ) : (
                        invoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-[#1a365d]">{invoice.invoice_number}</td>
                            <td className="px-6 py-4 text-sm">{formatDateShort(invoice.created_at)}</td>
                            <td className="px-6 py-4">{getStatusBadge(invoice.status, 'invoices')}</td>
                            <td className="px-6 py-4 text-right font-semibold">{formatCurrency(invoice.total)}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={invoice.balance_due > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                                {formatCurrency(invoice.balance_due)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button size="sm" variant="outline" onClick={() => downloadPdf('invoice', invoice.id)}>
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Projet</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date prévue</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                            Aucun projet
                          </td>
                        </tr>
                      ) : (
                        projects.map((project) => (
                          <tr key={project.id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <p className="font-medium text-[#1a365d]">{project.title}</p>
                              <p className="text-xs text-gray-500">{project.description}</p>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {project.service_type === 'manual' ? 'Déco Touché' : 
                               project.service_type === 'furniture' ? 'Mobilier' : 'Tech'}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {project.scheduled_date ? formatDateShort(project.scheduled_date) : '-'}
                            </td>
                            <td className="px-6 py-4">{getStatusBadge(project.status, 'projects')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="mt-8 bg-gray-50">
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-4">Des questions? Contactez-nous!</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="tel:+15143861743">
                  <Button variant="outline">
                    <Phone className="h-4 w-4 mr-2" />
                    514-386-1743
                  </Button>
                </a>
                <a href="mailto:cmgeorges.cie@gmail.com">
                  <Button variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    cmgeorges.cie@gmail.com
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
