import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, HardHat, Plus } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { addDays, dayKey, fmtDay, fmtTime, groupByDay, sameDay, startOfWeek } from '@/lib/agenda';
import { cn } from '@/lib/utils';
import { MHeader, Section, Loading, LoadError, Chips } from '../components/MUi';
import { ActionRow } from '../components/NextActions';
import { MActionForm } from '../components/MActionForm';
import { useLoad } from '../components/useLoad';
import { PROJECT_STATUS } from '../constants';

const DayBlock = ({ day, events, onAction }) => {
  const navigate = useNavigate();
  const today = sameDay(day, new Date());
  return (
    <div className="mb-4" data-testid={`m-agenda-day-${dayKey(day).slice(0, 10)}`}>
      <p className={cn('text-xs font-semibold uppercase tracking-wider mb-2', today ? 'text-[#D4AF37]' : 'text-slate-500')}>
        {fmtDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}{today ? ' · aujourd\'hui' : ''}
      </p>
      {events.length === 0 ? <p className="text-xs text-slate-600 pl-1">—</p> : (
        <div className="space-y-2">
          {events.map((ev) => ev.type === 'project' ? (
            <button key={ev.id} data-testid={`m-agenda-project-${ev.id}`} onClick={() => navigate(`/m/projects/${ev.id}`)}
              className="w-full text-left flex items-center gap-3 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-2.5 active:scale-[0.98] transition-transform">
              <HardHat className="h-4 w-4 text-[#D4AF37] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{ev.title}</p>
                <p className="text-[11px] text-slate-400 truncate">{fmtTime(ev.at)} · {ev.client_name} · {PROJECT_STATUS[ev.status]?.label}</p>
              </div>
            </button>
          ) : <ActionRow key={ev.id} a={ev} onChange={onAction} />)}
        </div>
      )}
    </div>
  );
};

export default function MAgenda() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [view, setView] = useState('week');
  const [adding, setAdding] = useState(false);
  const { data, loading, error, reload } = useLoad(async () => {
    const [ag, open] = await Promise.all([
      adminApi.getAgenda(weekStart.toISOString(), addDays(weekStart, 7).toISOString()),
      adminApi.getActions({ open_only: true, limit: 50 }),
    ]);
    return { agenda: ag.data, open: open.data };
  }, [weekStart]);
  const byDay = useMemo(() => groupByDay(data?.agenda), [data]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div data-testid="m-agenda-page">
      <MHeader back title="Agenda" subtitle={`Semaine du ${fmtDay(weekStart, { day: 'numeric', month: 'long' })}`}
        action={<button data-testid="m-agenda-add" onClick={() => setAdding(true)} className="h-10 w-10 rounded-full bg-[#D4AF37] text-[#0B1120] flex items-center justify-center active:scale-95"><Plus className="h-5 w-5" /></button>} />
      <div className="px-5 mb-4 flex items-center justify-between gap-2">
        <Chips options={[['week', 'Semaine'], ['todo', 'À faire']]} value={view} onChange={setView} testPrefix="m-agenda-view" />
        {view === 'week' && (
          <div className="flex gap-1 shrink-0">
            <button data-testid="m-agenda-prev" onClick={() => setWeekStart(addDays(weekStart, -7))} className="h-9 w-9 rounded-full border border-[#1E293B] flex items-center justify-center"><ChevronLeft className="h-4 w-4" /></button>
            <button data-testid="m-agenda-today" onClick={() => setWeekStart(startOfWeek(new Date()))} className="h-9 px-3 rounded-full border border-[#1E293B] text-xs font-semibold">Auj.</button>
            <button data-testid="m-agenda-next" onClick={() => setWeekStart(addDays(weekStart, 7))} className="h-9 w-9 rounded-full border border-[#1E293B] flex items-center justify-center"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      {loading ? <Loading /> : !data ? <LoadError error={error} onRetry={reload} /> : view === 'week' ? (
        <Section>{days.map((d) => <DayBlock key={d.toISOString()} day={d} events={byDay[dayKey(d)] || []} onAction={reload} />)}</Section>
      ) : (
        <Section title={`Actions ouvertes (${data.open.length})`}>
          <div className="space-y-2">
            {data.open.length === 0 && <p className="text-sm text-slate-500">Tout est à jour.</p>}
            {data.open.map((a) => <ActionRow key={a.id} a={a} onChange={reload} />)}
          </div>
        </Section>
      )}
      {adding && <MActionForm open onOpenChange={setAdding} onSaved={reload} />}
    </div>
  );
}
