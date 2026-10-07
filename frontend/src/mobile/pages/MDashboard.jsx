import { useNavigate } from 'react-router-dom';
import { UserPlus, FilePlus2, HardHat, Inbox, TrendingUp, Clock } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { getCurrentUser } from '@/lib/utils';
import { MCard, ListRow, Loading, LoadError, Pill, Section } from '../components/MUi';
import { useLoad } from '../components/useLoad';
import { LEAD_STATUS, PROJECT_STATUS, money, shortDate, progressOf } from '../constants';

const Stat = ({ label, value, icon: Icon, accent, testId, onClick }) => (
  <MCard testId={testId} onClick={onClick} className="p-4">
    <Icon className={`h-4 w-4 ${accent}`} />
    <p className="font-heading text-2xl font-bold text-white mt-3 leading-none">{value}</p>
    <p className="text-[11px] text-slate-400 mt-1.5">{label}</p>
  </MCard>
);

const Quick = ({ icon: Icon, label, onClick, testId }) => (
  <button data-testid={testId} onClick={onClick} className="flex flex-col items-center gap-2 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 py-4 active:scale-95 transition-transform">
    <Icon className="h-5 w-5 text-[#D4AF37]" />
    <span className="text-[11px] font-semibold text-slate-200">{label}</span>
  </button>
);

export default function MDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { data, loading, error, reload } = useLoad(async () => {
    const [s, c, l, p] = await Promise.all([
      adminApi.getStats(), adminApi.getCeoDashboard(), adminApi.getLeads({ status: 'new' }), adminApi.getProjects({ status: 'in_progress' }),
    ]);
    return { stats: s.data, ceo: c.data, leads: l.data.slice(0, 4), projects: p.data.slice(0, 4) };
  });

  if (loading) return <Loading />;
  if (!data) return <LoadError error={error} onRetry={reload} />;
  const { stats, ceo, leads, projects } = data;
  const month = new Intl.DateTimeFormat('fr-CA', { month: 'long' }).format(new Date());

  return (
    <div className="pt-5" data-testid="m-dashboard">
      <div className="px-5 mb-6 m-fade-in">
        <p className="text-xs text-slate-400">Bonjour{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}</p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white mt-1">Tableau de bord</h1>
      </div>

      <Section>
        <MCard testId="m-dash-revenue" onClick={() => navigate('/m/revenue')} className="bg-gradient-to-br from-[#D4AF37]/20 via-[#111827] to-[#111827] border-[#D4AF37]/25 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#E9C85A] font-semibold">Revenus — {month}</p>
          <p className="font-heading text-4xl font-bold text-white mt-2" data-testid="m-dash-monthly-revenue">{money(ceo.monthly_revenue)}</p>
          <div className="flex gap-5 mt-3 text-xs">
            <span className="text-slate-400">À encaisser <b className="text-white">{money(ceo.pending_invoices_amount)}</b></span>
            <span className="text-slate-400">Profit <b className="text-emerald-300">{money(ceo.monthly_profit)}</b></span>
          </div>
        </MCard>
      </Section>

      <Section>
        <div className="grid grid-cols-3 gap-2.5 m-stagger">
          <Stat testId="m-stat-new-leads" label="Nouveaux leads" value={stats.new_leads} icon={Inbox} accent="text-[#D4AF37]" onClick={() => navigate('/m/leads')} />
          <Stat testId="m-stat-projects" label="Chantiers actifs" value={ceo.projects_in_progress} icon={HardHat} accent="text-sky-300" onClick={() => navigate('/m/projects')} />
          <Stat testId="m-stat-conversion" label="Conversion" value={`${Math.round(stats.conversion_rate || 0)}%`} icon={TrendingUp} accent="text-emerald-300" />
        </div>
      </Section>

      <Section title="Actions rapides">
        <div className="grid grid-cols-3 gap-2.5">
          <Quick testId="m-quick-new-client" icon={UserPlus} label="Client" onClick={() => navigate('/m/clients?new=1')} />
          <Quick testId="m-quick-new-project" icon={HardHat} label="Projet" onClick={() => navigate('/m/projects?new=1')} />
          <Quick testId="m-quick-new-invoice" icon={FilePlus2} label="Facture" onClick={() => navigate('/m/invoices/new')} />
        </div>
      </Section>

      <Section title="Nouveaux leads" action={<button data-testid="m-dash-all-leads" onClick={() => navigate('/m/leads')} className="text-xs text-[#D4AF37] font-semibold">Tout voir</button>}>
        <div className="space-y-2 m-stagger">
          {leads.length === 0 && <p className="text-sm text-slate-500">Aucun nouveau lead.</p>}
          {leads.map((l) => (
            <ListRow key={l.id} testId={`m-dash-lead-${l.id}`} title={l.full_name} subtitle={`${l.city || 'Ville ?'} · ${shortDate(l.created_at)}`}
              right={<Pill map={LEAD_STATUS} value={l.status} />} onClick={() => navigate(`/m/leads/${l.id}`)} />
          ))}
        </div>
      </Section>

      <Section title="Chantiers en cours">
        <div className="space-y-2 m-stagger">
          {projects.length === 0 && <p className="text-sm text-slate-500">Aucun chantier en cours.</p>}
          {projects.map((p) => (
            <ListRow key={p.id} testId={`m-dash-project-${p.id}`} title={p.title}
              subtitle={<span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{progressOf(p)}% complété</span>}
              right={<Pill map={PROJECT_STATUS} value={p.status} />} onClick={() => navigate(`/m/projects/${p.id}`)} />
          ))}
        </div>
      </Section>
    </div>
  );
}
