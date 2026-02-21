import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  LogOut,
  TrendingUp,
  UserCheck,
  Receipt,
  Briefcase,
  Menu,
  X,
  Tag,
  DollarSign,
  ScrollText
} from 'lucide-react';
import { isAuthenticated, clearAuthData, getCurrentUser } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import LoadingLion from '@/components/LoadingLion';

const sidebarLinks = [
  { href: '/admin/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/leads', label: 'Leads', icon: Users },
  { href: '/admin/clients', label: 'Clients', icon: UserCheck },
  { href: '/admin/projects', label: 'Projets', icon: Briefcase },
  { href: '/admin/invoices', label: 'Factures', icon: Receipt },
  { href: '/admin/revenue', label: 'Revenus', icon: TrendingUp },
  { href: '/admin/discount-codes', label: 'Codes Promo', icon: Tag },
  { href: '/admin/pricing', label: 'Tarification', icon: DollarSign },
  { href: '/admin/policies', label: 'Politiques', icon: ScrollText },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/admin/login');
    } else {
      // Simulate initial load
      setTimeout(() => setLoading(false), 800);
    }
  }, [navigate]);

  const handleLogout = () => {
    clearAuthData();
    navigate('/admin/login');
  };

  if (loading) {
    return <LoadingLion message="Préparation de votre espace" />;
  }

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black" data-testid="admin-layout">
      {/* Mobile Menu Button */}
      <button 
        className="fixed top-4 left-4 z-50 lg:hidden bg-gray-900 p-2 rounded-lg text-gold-500"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-gray-900 via-gray-900 to-black border-r border-gold-500/20 transform transition-transform duration-300 z-40 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        data-testid="admin-sidebar"
      >
        {/* Logo */}
        <div className="p-6 border-b border-gold-500/20">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/30">
              <span className="text-2xl">🦁</span>
            </div>
            <div>
              <span className="font-bold text-xl text-white font-['Outfit']">CMGeorges</span>
              <span className="block text-xs text-gold-500/80">Administration</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="py-6 px-3">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href || location.pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-gold-500/20 to-gold-600/10 text-gold-500 border border-gold-500/30' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                data-testid={`admin-nav-${link.label.toLowerCase().replace(' ', '-')}`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-gold-500' : ''}`} />
                <span className="font-medium">{link.label}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-gold-500 animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gold-500/20 bg-black/50 backdrop-blur">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-black font-bold text-lg shadow-lg shadow-gold-500/30">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user?.full_name || 'Admin CMGeorges'}</p>
              <p className="text-xs text-gold-500/80 capitalize">{user?.role || 'admin'}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
            onClick={handleLogout}
            data-testid="admin-logout-btn"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-gold-500/20 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="lg:hidden w-10"></div>
            <h1 className="text-xl font-bold text-white font-['Outfit']">
              {sidebarLinks.find(l => location.pathname.startsWith(l.href))?.label || 'Administration'}
            </h1>
            <Link 
              to="/" 
              className="text-sm text-gold-500 hover:text-gold-400 flex items-center gap-1 transition-colors"
            >
              Voir le site
              <span className="text-lg">→</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
