import { adminApi } from '@/lib/api';
import { MHeader, MCard, Section, Loading, KV } from '../components/MUi';
import { useLoad } from '../components/useLoad';
import { money } from '../constants';

const monthLabel = (m) => new Intl.DateTimeFormat('fr-CA', { month: 'short' }).format(new Date(`${m}-15`));

export default function MRevenue() {
  const { data: d, loading } = useLoad(async () => (await adminApi.getCeoDashboard()).data);
  if (loading || !d) return <Loading />;
  const months = d.revenue_by_month || [];
  const max = Math.max(1, ...months.map((m) => m.revenue));

  return (
    <div data-testid="m-revenue-page">
      <MHeader back title="Revenus" subtitle="Vue CEO — mois en cours" />
      <Section>
        <div className="grid grid-cols-2 gap-2.5 m-stagger">
          {[
            ['Revenus', d.monthly_revenue, 'text-white', 'm-rev-revenue'],
            ['Profit', d.monthly_profit, 'text-emerald-300', 'm-rev-profit'],
            ['Coûts', d.monthly_costs, 'text-rose-300', 'm-rev-costs'],
            ['À encaisser', d.pending_invoices_amount, 'text-amber-300', 'm-rev-pending'],
          ].map(([k, v, c, t]) => (
            <MCard key={k} testId={t}><p className="text-[11px] text-slate-400">{k}</p><p className={`font-heading text-xl font-bold mt-1 ${c}`}>{money(v)}</p></MCard>
          ))}
        </div>
      </Section>

      <Section title="Revenus par mois">
        <MCard testId="m-rev-chart">
          <div className="flex items-end gap-2 h-36">
            {months.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                <span className="text-[9px] text-slate-400">{m.revenue > 0 ? `${Math.round(m.revenue)}$` : ''}</span>
                <div className="w-full rounded-t-md bg-gradient-to-t from-[#B8972E] to-[#E9C85A] transition-[height] duration-700" style={{ height: `${Math.max(3, (m.revenue / max) * 100)}%` }} />
                <span className="text-[10px] text-slate-500">{monthLabel(m.month)}</span>
              </div>
            ))}
          </div>
        </MCard>
      </Section>

      <Section title="Indicateurs">
        <MCard>
          <KV k="Marge moyenne — Réno" v={`${d.average_margin_manual}%`} />
          <KV k="Marge moyenne — Tech" v={`${d.average_margin_tech}%`} />
          <KV k="Projets en cours" v={d.projects_in_progress} />
          <KV k="Taux de conversion" v={`${Math.round(d.conversion_rate || 0)}%`} />
        </MCard>
      </Section>

      {d.top_services?.length > 0 && (
        <Section title="Top services">
          <MCard>{d.top_services.map((s, i) => <KV key={i} k={s.service || s.name || s._id} v={money(s.revenue || s.total || 0)} />)}</MCard>
        </Section>
      )}
    </div>
  );
}
