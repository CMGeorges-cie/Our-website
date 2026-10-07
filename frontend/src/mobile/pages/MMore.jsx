import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, TrendingUp, Bell, UserCircle, Download, Monitor, LogOut, ChevronRight, Share } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { clearAuthData } from '@/lib/utils';
import { MHeader, Section } from '../components/MUi';

const Item = ({ icon: Icon, label, hint, onClick, testId, danger }) => (
  <button data-testid={testId} onClick={onClick} className="w-full flex items-center gap-3.5 px-4 py-3.5 border-b border-[#1E293B] last:border-0 active:bg-white/5 text-left">
    <span className={`h-9 w-9 rounded-xl flex items-center justify-center ${danger ? 'bg-rose-500/10' : 'bg-[#D4AF37]/10'}`}>
      <Icon className={`h-[18px] w-[18px] ${danger ? 'text-rose-300' : 'text-[#D4AF37]'}`} />
    </span>
    <span className="flex-1">
      <span className={`block text-[15px] font-medium ${danger ? 'text-rose-300' : 'text-white'}`}>{label}</span>
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </span>
    {!danger && <ChevronRight className="h-4 w-4 text-slate-600" />}
  </button>
);

const Group = ({ children }) => <div className="rounded-2xl border border-[#1E293B] bg-[#111827] overflow-hidden">{children}</div>;

export default function MMore() {
  const navigate = useNavigate();
  const [iosHelp, setIosHelp] = useState(false);
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;

  const install = async () => {
    const p = window.__mInstallPrompt;
    if (p) {
      p.prompt();
      const r = await p.userChoice;
      if (r.outcome === 'accepted') toast.success('Application installée');
      window.__mInstallPrompt = null;
    } else {
      setIosHelp(true);
      setTimeout(() => document.querySelector('[data-testid="m-install-help"]')?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };
  const logout = async () => {
    await authApi.logout().catch(() => {});
    clearAuthData();
    navigate('/m/login', { replace: true });
  };

  return (
    <div data-testid="m-more-page">
      <MHeader title="Plus" subtitle="Tous les outils de gestion" />
      <Section title="Gestion">
        <Group>
          <Item testId="m-more-clients" icon={Users} label="Clients" hint="Fiches, historique, accès portail" onClick={() => navigate('/m/clients')} />
          <Item testId="m-more-quotes" icon={FileText} label="Soumissions" hint="Devis envoyés et acceptés" onClick={() => navigate('/m/quotes')} />
          <Item testId="m-more-revenue" icon={TrendingUp} label="Revenus" hint="Vue CEO, marges, encaissements" onClick={() => navigate('/m/revenue')} />
          <Item testId="m-more-notifications" icon={Bell} label="Notifications" onClick={() => navigate('/m/notifications')} />
        </Group>
      </Section>
      <Section title="Compte">
        <Group>
          <Item testId="m-more-profile" icon={UserCircle} label="Mon profil" hint="Mot de passe, 2FA" onClick={() => navigate('/m/profile')} />
          {!standalone && <Item testId="m-more-install" icon={Download} label="Installer l'application" hint="Ajouter à l'écran d'accueil" onClick={install} />}
          <Item testId="m-more-desktop" icon={Monitor} label="Version bureau complète" hint="Blog, tarifs, portfolio, rabais…" onClick={() => { window.location.href = '/admin/dashboard'; }} />
          <Item testId="m-more-logout" icon={LogOut} label="Se déconnecter" onClick={logout} danger />
        </Group>
      </Section>
      {iosHelp && (
        <Section title="Installer sur votre téléphone">
          <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 p-4 space-y-3 text-sm text-slate-300 m-fade-in" data-testid="m-install-help">
            <div className={isIOS ? '' : 'opacity-60'}>
              <p className="font-semibold text-white">iPhone / iPad (Safari)</p>
              <p className="mt-1">1. Touchez <Share className="inline h-4 w-4 text-[#D4AF37]" /> Partager en bas de l'écran<br />2. Choisissez « Sur l'écran d'accueil »<br />3. Touchez « Ajouter »</p>
              {isIOS && !isSafari && <p className="text-amber-300 text-xs mt-1">Ouvrez cette page dans Safari : l'installation n'est pas possible depuis un autre navigateur sur iPhone.</p>}
            </div>
            <div className={isIOS ? 'opacity-60' : ''}>
              <p className="font-semibold text-white">Android (Chrome)</p>
              <p className="mt-1">1. Touchez le menu ⋮ en haut à droite<br />2. Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil »</p>
            </div>
            <p className="text-xs text-slate-500">Ouvrez ensuite « Déco Gestion » depuis votre écran d'accueil : plein écran, comme une vraie app.</p>
          </div>
        </Section>
      )}
    </div>
  );
}
