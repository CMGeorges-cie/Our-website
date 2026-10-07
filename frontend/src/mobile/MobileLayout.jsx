import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LayoutDashboard, Inbox, Hammer, Receipt, Menu, Bell } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/utils';
import { BRAND } from '@/config/brand';
import { cn } from '@/lib/utils';
import './mobile.css';

const TABS = [
  { to: '/m', end: true, icon: LayoutDashboard, label: 'Accueil', id: 'home' },
  { to: '/m/leads', icon: Inbox, label: 'Leads', id: 'leads' },
  { to: '/m/projects', icon: Hammer, label: 'Projets', id: 'projects' },
  { to: '/m/invoices', icon: Receipt, label: 'Factures', id: 'invoices' },
  { to: '/m/plus', icon: Menu, label: 'Plus', id: 'more' },
];

export const MHead = () => (
  <Helmet title={`${BRAND.name} — Gestion`}>
    <link rel="manifest" href="/m-manifest.json" />
    <link rel="apple-touch-icon" href="/m-apple-touch-icon.png" />
    <meta name="theme-color" content="#0B1120" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Déco Gestion" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  </Helmet>
);

const useUnread = (path) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    adminApi.getUnreadCount().then((r) => setCount(r.data.count || 0)).catch(() => {});
  }, [path]);
  return count;
};

const TopBar = ({ unread }) => (
  <header className="sticky top-0 z-40 bg-[#0B1120]/85 backdrop-blur-xl border-b border-[#1E293B] pt-[env(safe-area-inset-top)]">
    <div className="flex items-center justify-between h-14 px-5">
      <Link to="/m" className="flex items-center gap-2.5" data-testid="m-topbar-brand">
        <img src="/m-icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
        <span className="font-heading font-bold text-white tracking-tight">{BRAND.name}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/30 rounded px-1.5 py-0.5">Gestion</span>
      </Link>
      <Link to="/m/notifications" className="relative h-10 w-10 flex items-center justify-center rounded-full active:bg-white/10" data-testid="m-topbar-notifications">
        <Bell className="h-5 w-5 text-slate-300" />
        {unread > 0 && (
          <span data-testid="m-unread-badge" className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D4AF37] text-[#0B1120] text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Link>
    </div>
  </header>
);

const BottomNav = () => (
  <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#0F172A]/90 backdrop-blur-xl border-t border-[#1E293B] pb-[env(safe-area-inset-bottom)]" data-testid="m-bottom-nav">
    <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
      {TABS.map(({ to, end, icon: Icon, label, id }) => (
        <NavLink key={id} to={to} end={end} data-testid={`m-tab-${id}`}
          className={({ isActive }) => cn('flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors', isActive ? 'text-[#D4AF37]' : 'text-slate-500')}>
          {({ isActive }) => (
            <>
              <span className={cn('h-8 w-12 rounded-full flex items-center justify-center transition-colors', isActive && 'bg-[#D4AF37]/12')}>
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default function MobileLayout() {
  const { pathname } = useLocation();
  const unread = useUnread(pathname);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/m-sw.js', { scope: '/m/' }).catch(() => {});
    const onPrompt = (e) => { e.preventDefault(); window.__mInstallPrompt = e; };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  if (!isAuthenticated()) return <Navigate to="/m/login" replace />;

  return (
    <div className="m-app min-h-screen bg-[#0B1120] text-slate-200" data-testid="m-layout">
      <MHead />
      <div className="m-grain" />
      <TopBar unread={unread} />
      <main className="relative z-10 max-w-lg mx-auto pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
