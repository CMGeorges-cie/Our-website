import { useState } from 'react';
import { Check, Plus, Trash2, AlarmClock } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { ACTION_KINDS, fmtDay, fmtTime, isOverdue } from '@/lib/agenda';
import { cn } from '@/lib/utils';
import { useAction, useLoad } from './useLoad';
import { MActionForm } from './MActionForm';

export const ActionRow = ({ a, onChange, showContact = true }) => {
  const { busy, run } = useAction();
  const toggle = async () => { const r = await run('t', () => adminApi.updateAction(a.id, { done: !a.done })); if (r) onChange?.(r.data); };
  const remove = async () => { if (await run('d', () => adminApi.deleteAction(a.id))) onChange?.(null, a.id); };
  const late = isOverdue(a);
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5', late ? 'border-rose-500/30 bg-rose-500/5' : 'border-[#1E293B] bg-[#111827]')} data-testid={`m-action-${a.id}`}>
      <button data-testid={`m-action-toggle-${a.id}`} onClick={toggle} disabled={busy === 't'}
        className={cn('h-6 w-6 shrink-0 rounded-md border flex items-center justify-center', a.done ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-slate-600')}>
        {a.done && <Check className="h-4 w-4 text-[#0B1120]" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', a.done ? 'text-slate-500 line-through' : 'text-white')}>{a.title}</p>
        <p className={cn('text-[11px] truncate', late ? 'text-rose-300' : 'text-slate-500')}>
          {ACTION_KINDS[a.kind]} · {fmtDay(a.due_at)} {fmtTime(a.due_at)}{showContact && a.contact_name ? ` · ${a.contact_name}` : ''}
        </p>
      </div>
      <button data-testid={`m-action-delete-${a.id}`} onClick={remove} className="text-slate-600 active:text-rose-300"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
};

export const NextActions = ({ link, actions, setActions }) => {
  const [open, setOpen] = useState(false);
  const onChange = (updated, removedId) => setActions(removedId ? actions.filter((x) => x.id !== removedId) : actions.map((x) => (x.id === updated.id ? updated : x)));
  return (
    <div className="space-y-2" data-testid="m-next-actions">
      {actions.length === 0 && <p className="text-sm text-slate-500 flex items-center gap-2"><AlarmClock className="h-4 w-4" /> Aucune action prévue.</p>}
      {actions.map((a) => <ActionRow key={a.id} a={a} onChange={onChange} showContact={false} />)}
      <button data-testid="m-next-action-add" onClick={() => setOpen(true)}
        className="w-full h-11 rounded-xl border border-dashed border-[#D4AF37]/40 text-[#D4AF37] text-sm font-semibold flex items-center justify-center gap-2 active:bg-[#D4AF37]/10">
        <Plus className="h-4 w-4" /> Planifier une action
      </button>
      {open && <MActionForm open link={link} onOpenChange={setOpen} onSaved={(a) => setActions([...actions, a].sort((x, y) => new Date(x.due_at) - new Date(y.due_at)))} />}
    </div>
  );
};

export const EntityActions = ({ link }) => {
  const { data, setData } = useLoad(async () => (await adminApi.getActions({ open_only: true, ...link })).data, [JSON.stringify(link)]);
  if (!data) return null;
  return <NextActions link={link} actions={data} setActions={setData} />;
};
