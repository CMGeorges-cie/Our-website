import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, HardHat, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ACTION_KINDS, addDays, dayKey, fmtDay, fmtTime, groupByDay, isOverdue, sameDay, startOfMonth, startOfWeek, toLocalInput } from '@/lib/agenda';

const field = 'bg-gray-800 border-gray-700 text-white';

const NewActionDialog = ({ open, onOpenChange, onSaved }) => {
  const tomorrow = () => { const d = addDays(new Date(), 1); d.setHours(9, 0, 0, 0); return toLocalInput(d); };
  const [f, setF] = useState({ title: '', kind: 'call', due_at: tomorrow(), target: '', notes: '' });
  const [people, setPeople] = useState({ clients: [], leads: [] });
  useEffect(() => {
    if (!open) return;
    Promise.all([adminApi.getClients(), adminApi.getLeads()]).then(([c, l]) => setPeople({ clients: c.data, leads: l.data }));
  }, [open]);
  const save = async (e) => {
    e.preventDefault();
    const [type, id] = f.target.split(':');
    try {
      await adminApi.createAction({ title: f.title, kind: f.kind, notes: f.notes, due_at: new Date(f.due_at).toISOString(), [`${type}_id`]: id });
      toast.success('Action planifiée');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };
  const sel = 'h-10 w-full rounded-md bg-gray-800 border border-gray-700 text-white px-3 text-sm';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white" data-testid="agenda-action-dialog">
        <DialogHeader><DialogTitle>Nouvelle action</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <Input required data-testid="agenda-action-title" className={field} placeholder="Rappeler pour confirmer la date" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select data-testid="agenda-action-kind" className={sel} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              {Object.entries(ACTION_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Input required type="datetime-local" data-testid="agenda-action-due" className={field} value={f.due_at} onChange={(e) => setF({ ...f, due_at: e.target.value })} />
          </div>
          <select required data-testid="agenda-action-target" className={sel} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })}>
            <option value="">Client ou lead…</option>
            <optgroup label="Clients">{people.clients.map((c) => <option key={c.id} value={`client:${c.id}`}>{c.full_name}</option>)}</optgroup>
            <optgroup label="Leads">{people.leads.map((l) => <option key={l.id} value={`lead:${l.id}`}>{l.full_name}</option>)}</optgroup>
          </select>
          <Input data-testid="agenda-action-notes" className={field} placeholder="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <Button type="submit" className="w-full bg-gold-500 hover:bg-gold-600 text-black font-semibold" data-testid="agenda-action-submit">Planifier</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Event = ({ ev, onToggle }) => ev.type === 'project' ? (
  <Link to={`/admin/projects/${ev.id}`} data-testid={`agenda-project-${ev.id}`} className="flex items-center gap-1 rounded bg-yellow-500/15 text-yellow-300 px-1.5 py-0.5 text-[11px] truncate hover:bg-yellow-500/25">
    <HardHat className="h-3 w-3 shrink-0" /> {fmtTime(ev.at)} {ev.title}
  </Link>
) : (
  <button onClick={() => onToggle(ev)} data-testid={`agenda-action-${ev.id}`} title={ev.contact_name}
    className={cn('w-full text-left flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] truncate', ev.done ? 'bg-gray-800 text-gray-500 line-through' : isOverdue(ev) ? 'bg-rose-500/15 text-rose-300' : 'bg-sky-500/15 text-sky-300')}>
    {fmtTime(ev.at)} {ev.title}
  </button>
);

export default function AdminAgenda() {
  const [mode, setMode] = useState('week');
  const [anchor, setAnchor] = useState(new Date());
  const [agenda, setAgenda] = useState(null);
  const [open, setOpen] = useState([]);
  const [dialog, setDialog] = useState(false);

  const { start, days } = useMemo(() => {
    if (mode === 'week') { const s = startOfWeek(anchor); return { start: s, days: Array.from({ length: 7 }, (_, i) => addDays(s, i)) }; }
    const s = startOfWeek(startOfMonth(anchor));
    return { start: s, days: Array.from({ length: 42 }, (_, i) => addDays(s, i)) };
  }, [mode, anchor]);

  const load = async () => {
    const [a, o] = await Promise.all([adminApi.getAgenda(start.toISOString(), addDays(days[days.length - 1], 1).toISOString()), adminApi.getActions({ open_only: true })]);
    setAgenda(a.data);
    setOpen(o.data);
  };
  useEffect(() => { load().catch(() => toast.error('Chargement impossible')); }, [start, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDay = useMemo(() => groupByDay(agenda), [agenda]);
  const toggle = async (a) => { await adminApi.updateAction(a.id, { done: !a.done }); load(); };
  const remove = async (a) => { await adminApi.deleteAction(a.id); load(); };
  const step = (n) => setAnchor(mode === 'week' ? addDays(anchor, 7 * n) : new Date(anchor.getFullYear(), anchor.getMonth() + n, 1));

  return (
    <div data-testid="admin-agenda-page">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Agenda</h1>
          <p className="text-gray-500 capitalize">{mode === 'week' ? `Semaine du ${fmtDay(start, { day: 'numeric', month: 'long', year: 'numeric' })}` : fmtDay(anchor, { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          {['week', 'month'].map((m) => (
            <Button key={m} size="sm" variant={mode === m ? 'default' : 'outline'} onClick={() => setMode(m)} data-testid={`agenda-mode-${m}`}
              className={mode === m ? 'bg-gold-500 text-black hover:bg-gold-600' : 'border-gray-700 text-gray-300'}>{m === 'week' ? 'Semaine' : 'Mois'}</Button>
          ))}
          <Button size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={() => step(-1)} data-testid="agenda-prev"><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={() => setAnchor(new Date())} data-testid="agenda-today">Aujourd'hui</Button>
          <Button size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={() => step(1)} data-testid="agenda-next"><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" className="bg-gold-500 hover:bg-gold-600 text-black font-semibold" onClick={() => setDialog(true)} data-testid="agenda-new-action"><Plus className="h-4 w-4 mr-1" /> Action</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="grid grid-cols-7 gap-px bg-gray-800 rounded-xl overflow-hidden border border-gray-800" data-testid="agenda-grid">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => <div key={d} className="bg-gray-900 text-xs text-gray-500 font-semibold px-2 py-2">{d}</div>)}
          {days.map((d) => {
            const evs = byDay[dayKey(d)] || [];
            const out = mode === 'month' && d.getMonth() !== anchor.getMonth();
            return (
              <div key={d.toISOString()} className={cn('bg-gray-900 p-1.5 space-y-1', mode === 'week' ? 'min-h-[320px]' : 'min-h-[110px]', out && 'opacity-40')} data-testid={`agenda-day-${dayKey(d).slice(0, 10)}`}>
                <p className={cn('text-xs font-semibold mb-1', sameDay(d, new Date()) ? 'text-gold-500' : 'text-gray-400')}>{d.getDate()}</p>
                {evs.map((ev) => <Event key={`${ev.type}-${ev.id}`} ev={ev} onToggle={toggle} />)}
              </div>
            );
          })}
        </div>

        <aside className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-fit" data-testid="agenda-open-actions">
          <h2 className="font-semibold text-white mb-3">Prochaines actions ({open.length})</h2>
          <div className="space-y-2 max-h-[560px] overflow-y-auto">
            {open.length === 0 && <p className="text-sm text-gray-500">Tout est à jour.</p>}
            {open.map((a) => (
              <div key={a.id} className={cn('flex items-start gap-2 rounded-lg border p-2', isOverdue(a) ? 'border-rose-500/30 bg-rose-500/5' : 'border-gray-800')} data-testid={`agenda-open-${a.id}`}>
                <button onClick={() => toggle(a)} className="mt-0.5 h-5 w-5 shrink-0 rounded border border-gray-600 flex items-center justify-center hover:border-gold-500" data-testid={`agenda-open-done-${a.id}`}><Check className="h-3 w-3 text-gray-500" /></button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{a.title}</p>
                  <p className={cn('text-xs', isOverdue(a) ? 'text-rose-300' : 'text-gray-500')}>{ACTION_KINDS[a.kind]} · {fmtDay(a.due_at)} {fmtTime(a.due_at)}</p>
                  {a.contact_name && (
                    <Link to={a.client_id ? `/admin/clients/${a.client_id}` : `/admin/leads/${a.lead_id}`} className="text-xs text-gold-500 hover:underline">{a.contact_name}</Link>
                  )}
                </div>
                <button onClick={() => remove(a)} className="text-gray-600 hover:text-rose-400" data-testid={`agenda-open-delete-${a.id}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </aside>
      </div>
      {dialog && <NewActionDialog open onOpenChange={setDialog} onSaved={load} />}
    </div>
  );
}
