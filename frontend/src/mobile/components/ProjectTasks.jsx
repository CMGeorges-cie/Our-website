import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { inputCls } from './MUi';
import { useAction } from './useLoad';
import { cn } from '@/lib/utils';

export const ProjectTasks = ({ projectId, tasks, onChange }) => {
  const [title, setTitle] = useState('');
  const { busy, run } = useAction();

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (await run('add', () => adminApi.createProjectTask(projectId, { title: title.trim() }))) { setTitle(''); onChange(); }
  };
  const toggle = async (t) => {
    if (await run(t.id, () => adminApi.updateProjectTask(projectId, t.id, t.status === 'completed' ? 'pending' : 'completed'))) onChange();
  };
  const remove = async (t) => {
    if (await run(`d${t.id}`, () => adminApi.deleteProjectTask(projectId, t.id))) onChange();
  };

  return (
    <div className="space-y-2" data-testid="m-project-tasks">
      {tasks.map((t) => {
        const done = t.status === 'completed';
        return (
          <div key={t.id} className="flex items-center gap-3 rounded-xl border border-[#1E293B] bg-[#111827] px-3 py-2.5" data-testid={`m-task-${t.id}`}>
            <button data-testid={`m-task-toggle-${t.id}`} onClick={() => toggle(t)} disabled={busy === t.id}
              className={cn('h-6 w-6 shrink-0 rounded-md border flex items-center justify-center transition-colors', done ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-slate-600')}>
              {done && <Check className="h-4 w-4 text-[#0B1120]" />}
            </button>
            <span className={cn('flex-1 text-sm', done ? 'text-slate-500 line-through' : 'text-white')}>{t.title}</span>
            <button data-testid={`m-task-delete-${t.id}`} onClick={() => remove(t)} className="text-slate-500 active:text-rose-300"><Trash2 className="h-4 w-4" /></button>
          </div>
        );
      })}
      <form onSubmit={add} className="flex gap-2">
        <input data-testid="m-task-new-input" className={inputCls} placeholder="Nouvelle tâche…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button data-testid="m-task-add-btn" type="submit" disabled={busy === 'add'} className="h-11 w-11 shrink-0 rounded-xl bg-[#D4AF37] text-[#0B1120] flex items-center justify-center active:scale-95">
          <Plus className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};
