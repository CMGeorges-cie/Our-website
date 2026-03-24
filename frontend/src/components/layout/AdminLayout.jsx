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
  BookOpen,
  Tag,
  DollarSign,
  Shield,
  UserCog,
  Bell,
  Sun,
  Moon,
  Package
} from 'lucide-react';
import { isAuthenticated, clearAuthData, getCurrentUser } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import LoadingLion from '@/components/LoadingLion';
import { adminApi } from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';

const SERVICEFLOW_LOGO = "https://customer-assets.emergentagent.com/job_57c7ca12-f939-4f77-840a-6e3a2010ce9e/artifacts/xu0d6vd3_ChatGPT%20Image%20Mar%2011%2C%202026%2C%2011_52_31%20PM.png";

const sidebarLinks = [
  { href: '/admin/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/leads', label: 'Leads', icon: Users },
  { href: '/admin/clients', label: 'Clients', icon: UserCheck },
  { href: '/admin/projects', label: 'Projets', icon: Briefcase },
  { href: '/admin/catalog', label: 'Catalogue', icon: Package },
  { href: '/admin/invoices', label: 'Factures', icon: Receipt },
  { href: '/admin/revenue', label: 'Revenus', icon: TrendingUp },
];

const settingsLinks = [
  { href: '/admin/users', label: 'Utilisateurs', icon: UserCog },
  { href: '/admin/blog', label: 'Blog', icon: BookOpen },
  { href: '/admin/discounts', label: 'Codes Promo', icon: Tag },
  { href: '/admin/pricing', label: 'Tarification', icon: DollarSign },
  { href: '/admin/policies', label: 'Politiques', icon: Shield },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/admin/login');
    } else {
      // Simulate initial load
      setTimeout(() => setLoading(false), 800);
      // Fetch unread notifications count
      fetchUnreadCount();
    }
  }, [navigate]);

  // Refresh unread count when location changes
  useEffect(() => {
    if (isAuthenticated()) {
      fetchUnreadCount();
    }
  }, [location.pathname]);

  const fetchUnreadCount = async () => {
    try {
      const res = await adminApi.getUnreadCount();
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Failed to fetch notification count');
    }
  };

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
        <div className="p-5 border-b border-gold-500/20">
          <Link to="/admin" className="flex items-center gap-3 mb-3">
            <img 
              src={SERVICEFLOW_LOGO} 
              alt="ServiceFlow" 
              className="w-10 h-10 rounded-lg shadow-lg shadow-yellow-400/20"
            />
            <div>
              <span className="font-black text-lg text-white tracking-tight">Service<span className="text-yellow-400">Flow</span></span>
            </div>
          </Link>
          <div className="flex items-center gap-2 bg-gold-500/10 border border-gold-500/20 rounded-lg px-3 py-2">
            <div className="w-6 h-6 bg-gradient-to-br from-gold-400 to-gold-600 rounded-md flex items-center justify-center text-xs font-bold text-black">C</div>
            <div>
              <span className="text-xs font-semibold text-white block leading-none">CMGeorges</span>
              <span className="text-[10px] text-gold-500/60">Workspace</span>
            </div>
          </div>
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

          {/* Settings Group */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-600 uppercase px-4 mb-2 tracking-wider">Paramètres</p>
            {settingsLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href || location.pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-gold-500/20 to-gold-600/10 text-gold-500 border border-gold-500/30' 
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                  data-testid={`admin-nav-${link.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-gold-500' : ''}`} />
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              );
            })}
          </div>
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
              {sidebarLinks.find(l => location.pathname.startsWith(l.href))?.label || 
               settingsLinks.find(l => location.pathname.startsWith(l.href))?.label ||
               (location.pathname.includes('notifications') ? 'Notifications' : 'Administration')}
            </h1>
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-400 hover:text-gold-500 hover:bg-gold-500/10 transition-colors"
                data-testid="theme-toggle"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              
              {/* Notification Bell */}
              <Link
                to="/admin/notifications"
                className="relative p-2 rounded-lg text-gray-400 hover:text-gold-500 hover:bg-gold-500/10 transition-colors"
                data-testid="notification-bell"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span 
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1"
                    data-testid="notification-badge"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link 
                to="/" 
                className="text-sm text-gold-500 hover:text-gold-400 flex items-center gap-1 transition-colors"
              >
                Voir le site
                <span className="text-lg">→</span>
              </Link>
            </div>
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
