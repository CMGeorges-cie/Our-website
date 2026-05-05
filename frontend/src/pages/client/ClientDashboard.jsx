import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { clientPortalApi, saasApi } from '@/lib/api';
import { toast } from 'sonner';
import { 
  LogOut, LayoutDashboard, Briefcase, Receipt, 
  CheckCircle, Clock, AlertCircle, DollarSign, ArrowRight, ExternalLink
} from 'lucide-react';
import { getClientToken, clearClientAuth } from './ClientLogin';

const SERVICEFLOW_LOGO = "https://customer-assets.emergentagent.com/job_57c7ca12-f939-4f77-840a-6e3a2010ce9e/artifacts/xu0d6vd3_ChatGPT%20Image%20Mar%2011%2C%202026%2C%2011_52_31%20PM.png";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const formatCurrency = (v) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v || 0);
const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-CA') : '-';

const statusColors = {
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  pending: 'bg-gray-500/20 text-gray-400',
  scheduled: 'bg-yellow-500/20 text-yellow-400',
  paid: 'bg-green-500/20 text-green-400',
  sent: 'bg-blue-500/20 text-blue-400',
  unpaid: 'bg-red-500/20 text-red-400',
  partial: 'bg-yellow-500/20 text-yellow-400',
};
const statusLabels = {
  in_progress: 'En cours', completed: 'Terminé', pending: 'En attente', scheduled: 'Planifié',
  paid: 'Payée', sent: 'Envoyée', unpaid: 'Non payée', partial: 'Partielle', draft: 'Brouillon',
};

export default function ClientDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payingId, setPayingId] = useState(null);

  const user = (() => { try { return JSON.parse(localStorage.getItem('sf_client_user') || '{}'); } catch { return {}; } })();

  useEffect(() => {
    const token = getClientToken();
    if (!token) { navigate('/client/login'); return; }
    
    // Check payment return
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');
    if (sessionId) {
      clientPortalApi.getPaymentStatus(sessionId).then(res => {
        if (res.data.payment_status === 'paid') toast.success('Paiement confirmé!');
      }).catch(() => {});
    }

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [dashRes, projRes, invRes] = await Promise.all([
        clientPortalApi.getDashboard(),
        clientPortalApi.getProjects(),
        clientPortalApi.getInvoices(),
      ]);
      setData(dashRes.data);
      setProjects(projRes.data || []);
      setInvoices(invRes.data || []);
    } catch (e) {
      if (e.response?.status === 401) { clearClientAuth(); navigate('/client/login'); }
    } finally { setLoading(false); }
  };

  const handleLogout = () => { clearClientAuth(); navigate('/client/login'); };

  const handlePayInvoice = async (invoice) => {
    setPayingId(invoice.id);
    try {
      const res = await clientPortalApi.payInvoice(invoice.id);
      window.location.href = res.data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur de paiement');
      setPayingId(null);
    }
  };

  const downloadInvoicePdf = (id) => window.open(`${BACKEND_URL}/api/v1/admin/invoices/${id}/pdf`, '_blank');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/50">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d1f]" data-testid="client-dashboard">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#13132b]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={SERVICEFLOW_LOGO} 
              alt="ServiceFlow" 
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-black text-white">Service<span className="text-yellow-400">Flow</span></span>
            <span className="text-white/20 text-sm ml-2">/ Portail Client</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm hidden md:block">{user.full_name || user.email}</span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm" data-testid="client-logout-btn">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-white/10 bg-[#13132b]/40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
              { id: 'projects', label: 'Mes projets', icon: Briefcase },
              { id: 'invoices', label: 'Mes factures', icon: Receipt },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-white/40 hover:text-white/70'}`}
                  data-testid={`client-tab-${tab.id}`}
                >
                  <Icon className="w-4 h-4" />{tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Bonjour, {user.full_name || 'Client'} 👋</h1>
              <p className="text-white/40 mt-1">Voici un aperçu de vos dossiers avec Déco Touché</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Projets actifs', value: data?.stats?.active_projects || 0, color: 'text-blue-400', icon: Briefcase },
                { label: 'Projets total', value: data?.stats?.projects_count || 0, color: 'text-white', icon: LayoutDashboard },
                { label: 'Factures', value: data?.stats?.invoices_count || 0, color: 'text-white', icon: Receipt },
                { label: 'Solde dû', value: formatCurrency(data?.stats?.pending_amount), color: 'text-red-400', icon: DollarSign },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-yellow-400/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-yellow-400" />
                      </div>
                    </div>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-white/40 text-sm mt-0.5">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Recent Projects */}
            {(data?.recent_projects?.length > 0) && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Projets récents</h2>
                  <button onClick={() => setActiveTab('projects')} className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1">Voir tout <ArrowRight className="w-3 h-3" /></button>
                </div>
                <div className="grid gap-3">
                  {data.recent_projects.slice(0, 3).map(p => (
                    <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{p.title}</p>
                        <p className="text-white/40 text-sm">{formatDate(p.created_at)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-500/20 text-gray-400'}`}>{statusLabels[p.status] || p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Invoices */}
            {invoices.filter(i => ['sent', 'unpaid', 'partial'].includes(i.status)).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Factures en attente</h2>
                  <button onClick={() => setActiveTab('invoices')} className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1">Voir tout <ArrowRight className="w-3 h-3" /></button>
                </div>
                <div className="grid gap-3">
                  {invoices.filter(i => ['sent', 'unpaid', 'partial'].includes(i.status)).slice(0, 3).map(inv => (
                    <div key={inv.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{inv.invoice_number}</p>
                        <p className="text-white/40 text-sm">Solde: {formatCurrency(inv.balance_due)}</p>
                      </div>
                      <Button onClick={() => handlePayInvoice(inv)} disabled={payingId === inv.id} className="bg-yellow-400 hover:bg-yellow-300 text-[#23153c] text-sm font-semibold px-4 py-2" data-testid={`pay-invoice-btn-${inv.id}`}>
                        {payingId === inv.id ? 'Chargement...' : 'Payer'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!data?.client && (
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-6 text-center">
                <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                <p className="text-white font-medium">Compte non lié à un profil client</p>
                <p className="text-white/50 text-sm mt-1">Contactez Déco Touché pour associer votre compte à vos projets.</p>
              </div>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Mes projets</h1>
            {projects.length === 0 ? (
              <div className="text-center py-20 text-white/40">Aucun projet trouvé</div>
            ) : (
              <div className="grid gap-4">
                {projects.map(p => (
                  <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-6" data-testid={`client-project-${p.id}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-white font-semibold">{p.title}</h3>
                        {p.description && <p className="text-white/50 text-sm mt-1">{p.description}</p>}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-500/20 text-gray-400'}`}>{statusLabels[p.status] || p.status}</span>
                    </div>
                    {typeof p.progress === 'number' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-white/40 mb-1">
                          <span>Progression</span><span>{p.progress}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full transition-all" style={{width: `${p.progress}%`}}></div>
                        </div>
                      </div>
                    )}
                    <p className="text-white/30 text-xs mt-3">{formatDate(p.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Mes factures</h1>
            {invoices.length === 0 ? (
              <div className="text-center py-20 text-white/40">Aucune facture trouvée</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white/40 uppercase">Facture</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white/40 uppercase">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white/40 uppercase">Statut</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-white/40 uppercase">Total</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-white/40 uppercase">Solde dû</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-white/40 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} className="border-t border-white/10 hover:bg-white/5 transition-colors" data-testid={`client-invoice-${inv.id}`}>
                        <td className="px-6 py-4 text-yellow-400 font-medium">{inv.invoice_number}</td>
                        <td className="px-6 py-4 text-white/60 text-sm">{formatDate(inv.created_at)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[inv.status] || 'bg-gray-500/20 text-gray-400'}`}>{statusLabels[inv.status] || inv.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-white font-medium">{formatCurrency(inv.total)}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={inv.balance_due > 0 ? 'text-red-400 font-medium' : 'text-green-400'}>{formatCurrency(inv.balance_due)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => downloadInvoicePdf(inv.id)} className="text-white/40 hover:text-white/70 transition-colors p-1" title="Télécharger PDF"><ExternalLink className="w-4 h-4" /></button>
                            {inv.balance_due > 0 && (
                              <Button onClick={() => handlePayInvoice(inv)} disabled={payingId === inv.id} className="bg-yellow-400 hover:bg-yellow-300 text-[#23153c] text-xs font-semibold px-3 py-1.5 h-auto" data-testid={`pay-invoice-${inv.id}`}>
                                {payingId === inv.id ? '...' : 'Payer'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
