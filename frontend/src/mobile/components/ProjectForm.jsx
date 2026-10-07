import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { MButton, Field, inputCls } from './MUi';
import { BottomSheet } from './BottomSheet';
import { useAction, useLoad } from './useLoad';
import { SERVICE_TYPES } from '../constants';

const toLocal = (d) => (d ? new Date(d).toISOString().slice(0, 16) : '');

export const ProjectForm = ({ open, onOpenChange, project, defaultClient, onSaved }) => {
  const [f, setF] = useState({
    client_id: project?.client_id || defaultClient || '',
    title: project?.title || '',
    description: project?.description || '',
    service_type: project?.service_type || 'manual',
    scheduled_date: toLocal(project?.scheduled_date),
    estimated_hours: project?.estimated_hours ?? '',
    actual_hours: project?.actual_hours ?? '',
    notes: project?.notes || '',
  });
  const { busy, run } = useAction();
  const { data: clients } = useLoad(async () => (project ? [] : (await adminApi.getClients()).data));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const scheduled = f.scheduled_date ? new Date(f.scheduled_date).toISOString() : null;
    const r = project
      ? await run('save', () => adminApi.updateProject(project.id, {
          title: f.title, description: f.description, scheduled_date: scheduled, notes: f.notes,
          actual_hours: f.actual_hours === '' ? null : parseFloat(f.actual_hours),
        }), 'Projet mis à jour')
      : await run('save', () => adminApi.createProject({
          client_id: f.client_id, title: f.title, description: f.description, service_type: f.service_type,
          scheduled_date: scheduled, estimated_hours: f.estimated_hours === '' ? null : parseFloat(f.estimated_hours),
        }), 'Projet créé');
    if (r) { onSaved(r.data); onOpenChange(false); }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={project ? 'Modifier le projet' : 'Nouveau projet'} testId="m-project-form">
      <form onSubmit={save} className="space-y-3">
        {!project && (
          <Field label="Client *">
            <select data-testid="m-project-form-client" required className={inputCls} value={f.client_id} onChange={set('client_id')}>
              <option value="">Choisir un client…</option>
              {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Titre *"><input data-testid="m-project-form-title" required className={inputCls} value={f.title} onChange={set('title')} /></Field>
        {!project && (
          <Field label="Service">
            <select data-testid="m-project-form-service" className={inputCls} value={f.service_type} onChange={set('service_type')}>
              {Object.entries(SERVICE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        )}
        <Field label="Date prévue"><input data-testid="m-project-form-date" type="datetime-local" className={inputCls} value={f.scheduled_date} onChange={set('scheduled_date')} /></Field>
        {project ? (
          <Field label="Heures réelles"><input data-testid="m-project-form-actual-hours" inputMode="decimal" className={inputCls} value={f.actual_hours} onChange={set('actual_hours')} /></Field>
        ) : (
          <Field label="Heures estimées"><input data-testid="m-project-form-hours" inputMode="decimal" className={inputCls} value={f.estimated_hours} onChange={set('estimated_hours')} /></Field>
        )}
        <Field label="Description">
          <textarea data-testid="m-project-form-description" rows={3} className={`${inputCls} h-auto py-2`} value={f.description} onChange={set('description')} />
        </Field>
        {project && (
          <Field label="Notes">
            <textarea data-testid="m-project-form-notes" rows={2} className={`${inputCls} h-auto py-2`} value={f.notes} onChange={set('notes')} />
          </Field>
        )}
        <MButton type="submit" data-testid="m-project-form-submit" loading={busy === 'save'} className="w-full">Enregistrer</MButton>
      </form>
    </BottomSheet>
  );
};
