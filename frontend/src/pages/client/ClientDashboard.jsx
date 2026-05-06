import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clientPortalApi } from '@/lib/api';
import { toast } from 'sonner';
import { 
  LayoutDashboard, FileText, Briefcase, User, LogOut, 
  Receipt, Clock, CheckCircle, AlertCircle, Loader2, 
  Save, CreditCard, Download, MessageSquare
} from 'lucide-react';

const SERVICEFLOW_LOGO = "https://customer-assets.emergentagent.com/job_9d041269-feaf-4cbb-a5f7-16135f256136/artifacts/lzun575u_Logo%20officiel.svg";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [profile, setProfile] = useState({ full_name: '', email: '', phone: '', address: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('cmgeorges_token');
    if (!token) { navigate('/connexion'); return; }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [dashRes, projRes, invRes, profRes] = await Promise.allSettled([
        clientPortalApi.getDashboard(),
        clientPortalApi.getProjects(),
        clientPortalApi.getInvoices(),
        clientPortalApi.getProfile(),
      ]);
      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data);
      if (projRes.status === 'fulfilled') setProjects(projRes.value.data);
      if (invRes.status === 'fulfilled') setInvoices(invRes.value.data);
      if (profRes.status === 'fulfilled') setProfile(profRes.value.data);
    } catch (err) {
      if (err.response?.status === 401) { navigate('/connexion'); return; }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cmgeorges_token');
    localStorage.removeItem('cmgeorges_user');
    navigate('/connexion');
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await clientPortalApi.updateProfile(profile);
      setProfile(res.data);
      toast.success('Profil mis à jour avec succès');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur de mise à jour');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePayInvoice = async (invoiceId) => {
    window.open(`/paiement?invoice=${invoiceId}`, '_blank');
  };

  const statusLabel = (s) => {
    const map = { draft: 'Brouillon', sent: 'Envoyée', partial: 'Partiel', paid: 'Payée', overdue: 'En retard' };
    return map[s] || s;
  };

  const statusColor = (s) => {
    const map = { paid: 'text-green-500 bg-green-500/10', partial: 'text-yellow-500 bg-yellow-500/10', sent: 'text-blue-500 bg-blue-500/10', overdue: 'text-red-500 bg-red-500/10' };
    return map[s] || 'text-gray-500 bg-gray-500/10';
  };

  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'projects', label: 'Mes projets', icon: Briefcase },
    { id: 'invoices', label: 'Mes factures', icon: Receipt },
    { id: 'profile', label: 'Mon profil', icon: User },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="client-dashboard">
      {/* Header */}
      <header className="bg-[#1a365d] text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={SERVICEFLOW_LOGO} alt="Déco Touché" className="h-8" />
            <span className="font-bold font-['Outfit']">Déco <span className="text-[#d4af37]">Touché</span></span>
            <span className="text-white/40 text-sm ml-2">| Portail client</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70 hidden sm:block">{profile.full_name || profile.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/70 hover:text-white" data-testid="client-logout-btn">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id ? 'border-[#d4af37] text-[#1a365d]' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                data-testid={`client-tab-${t.id}`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Dashboard Tab */}
        {tab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[#1a365d] font-['Outfit']">Bienvenue, {profile.full_name || 'Client'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <Briefcase className="h-8 w-8 text-[#d4af37] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#1a365d]">{dashboard.total_projects || 0}</p>
                  <p className="text-sm text-gray-500">Projets</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Receipt className="h-8 w-8 text-[#d4af37] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#1a365d]">{dashboard.total_invoices || 0}</p>
                  <p className="text-sm text-gray-500">Factures</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#1a365d]">{dashboard.paid_invoices || 0}</p>
                  <p className="text-sm text-gray-500">Factures payées</p>
                </CardContent>
              </Card>
            </div>
            {dashboard.pending_amount > 0 && (
              <Card className="border-[#d4af37]/30 bg-[#d4af37]/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-[#d4af37]" />
                  <p className="text-sm"><strong>{dashboard.pending_amount?.toFixed(2)}$</strong> en factures en attente de paiement</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {tab === 'projects' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#1a365d] font-['Outfit']">Mes projets</h2>
            {projects.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-gray-500">Aucun projet en cours</CardContent></Card>
            ) : (
              projects.map(p => (
                <Card key={p.id} data-testid={`client-project-${p.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-[#1a365d]">{p.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{p.description || 'Aucune description'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        p.status === 'completed' ? 'bg-green-100 text-green-700' :
                        p.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {p.status === 'completed' ? 'Terminé' : p.status === 'in_progress' ? 'En cours' : p.status}
                      </span>
                    </div>
                    {p.progress !== undefined && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progression</span>
                          <span>{p.progress || 0}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#d4af37] rounded-full" style={{ width: `${p.progress || 0}%` }} />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {tab === 'invoices' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#1a365d] font-['Outfit']">Mes factures</h2>
            {invoices.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-gray-500">Aucune facture</CardContent></Card>
            ) : (
              invoices.map(inv => (
                <Card key={inv.id} data-testid={`client-invoice-${inv.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[#1a365d]">{inv.invoice_number}</h3>
                        <p className="text-sm text-gray-500">{inv.created_at ? new Date(inv.created_at).toLocaleDateString('fr-CA') : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#1a365d]">{inv.total?.toFixed(2)}$</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(inv.status)}`}>
                          {statusLabel(inv.status)}
                        </span>
                      </div>
                    </div>
                    {inv.status !== 'paid' && (
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" onClick={() => handlePayInvoice(inv.id)} className="bg-[#d4af37] hover:bg-[#c4a030] text-[#1a365d]" data-testid={`pay-invoice-${inv.id}`}>
                          <CreditCard className="h-3.5 w-3.5 mr-1" /> Payer
                        </Button>
                      </div>
                    )}
                    {inv.balance_due > 0 && inv.amount_paid > 0 && (
                      <p className="text-xs text-gray-400 mt-2">Payé: {inv.amount_paid?.toFixed(2)}$ — Solde: {inv.balance_due?.toFixed(2)}$</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="max-w-xl space-y-6">
            <h2 className="text-xl font-bold text-[#1a365d] font-['Outfit']">Mon profil</h2>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label>Nom complet</Label>
                  <Input value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="mt-1" data-testid="profile-name" />
                </div>
                <div>
                  <Label>Courriel</Label>
                  <Input value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="mt-1" data-testid="profile-email" />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="514-555-0000" className="mt-1" data-testid="profile-phone" />
                </div>
                <div>
                  <Label>Adresse</Label>
                  <Input value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} placeholder="123 rue Exemple, Montréal" className="mt-1" data-testid="profile-address" />
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-[#d4af37] hover:bg-[#c4a030] text-[#1a365d]" data-testid="save-profile-btn">
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
