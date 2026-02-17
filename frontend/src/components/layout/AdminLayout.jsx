import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  LogOut,
  Settings
} from 'lucide-react';
import { isAuthenticated, clearAuthData, getCurrentUser } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const sidebarLinks = [
  { href: '/admin/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/leads', label: 'Leads', icon: Users },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    clearAuthData();
    navigate('/admin/login');
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100" data-testid="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar" data-testid="admin-sidebar">
        <div className="p-6 border-b border-white/10">
          <Link to="/admin" className="flex items-center gap-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_cmgeorges-prod/artifacts/3w0w7gaw_logo_cmgeorges.svg" 
              alt="CMGeorges"
              className="h-10 w-auto brightness-0 invert"
            />
            <div>
              <span className="font-bold text-lg font-['Outfit']">CMGeorges</span>
              <span className="block text-xs text-white/60">Administration</span>
            </div>
          </Link>
        </div>

        <nav className="py-6">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                data-testid={`admin-nav-${link.label.toLowerCase().replace(' ', '-')}`}
              >
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-8 h-8 rounded-full bg-[#d4af37] flex items-center justify-center text-[#1a365d] font-bold text-sm">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.full_name || 'Admin'}</p>
              <p className="text-xs text-white/60 capitalize">{user?.role || 'admin'}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
            onClick={handleLogout}
            data-testid="admin-logout-btn"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#1a365d] font-['Outfit']">
              {sidebarLinks.find(l => l.href === location.pathname)?.label || 'Administration'}
            </h1>
            <Link to="/" className="text-sm text-gray-500 hover:text-[#1a365d]">
              Voir le site →
            </Link>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
