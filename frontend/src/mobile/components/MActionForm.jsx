import { useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { ACTION_KINDS, toLocalInput } from '@/lib/agenda';
import { MButton, Field, inputCls } from './MUi';
import { BottomSheet } from './BottomSheet';
import { useAction, useLoad } from './useLoad';

const defaultDue = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return toLocalInput(d); };

export const MActionForm = ({ open, onOpenChange, link, onSaved }) => {
  const [f, setF] = useState({ title: '', kind: 'call', due_at: defaultDue(), notes: '', client_id: link?.client_id || '' });
  const { busy, run } = useAction();
  const { data: clients } = useLoad(async () => (link ? [] : (await adminApi.getClients()).data));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const body = { ...f, ...(link || {}), due_at: new Date(f.due_at).toISOString() };
    if (!body.client_id) delete body.client_id;
    if (!body.client_id && !body.lead_id && !body.project_id) return toast.error('Choisissez un client');
    const r = await run('save', () => adminApi.createAction(body), 'Action planifiée');
    if (r) { onOpenChange(false); onSaved?.(r.data); }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Prochaine action" testId="m-action-form">
      <form onSubmit={save} className="space-y-3">
        <Field label="Quoi faire ? *"><input data-testid="m-action-title" required className={inputCls} value={f.title} onChange={set('title')} placeholder="Rappeler pour confirmer la date" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select data-testid="m-action-kind" className={inputCls} value={f.kind} onChange={set('kind')}>
              {Object.entries(ACTION_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Quand *"><input data-testid="m-action-due" type="datetime-local" required className={inputCls} value={f.due_at} onChange={set('due_at')} /></Field>
        </div>
        {!link && (
          <Field label="Client *">
            <select data-testid="m-action-client" required className={inputCls} value={f.client_id} onChange={set('client_id')}>
              <option value="">Choisir…</option>
              {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Notes"><input data-testid="m-action-notes" className={inputCls} value={f.notes} onChange={set('notes')} /></Field>
        <MButton type="submit" data-testid="m-action-submit" loading={busy === 'save'} className="w-full">Planifier</MButton>
      </form>
    </BottomSheet>
  );
};
