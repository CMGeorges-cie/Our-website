import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { MButton, Field, inputCls } from './MUi';
import { BottomSheet } from './BottomSheet';
import { useAction } from './useLoad';

const EMPTY = { full_name: '', email: '', phone: '', address: '', city: '', postal_code: '', company_name: '', notes: '' };

export const ClientForm = ({ open, onOpenChange, client, onSaved }) => {
  const [f, setF] = useState(() => ({ ...EMPTY, ...(client || {}) }));
  const { busy, run } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(Object.keys(EMPTY).map((k) => [k, f[k] || '']));
    if (!body.company_name) body.company_name = null;
    const r = await run('save', () => (client ? adminApi.updateClient(client.id, body) : adminApi.createClient(body)), client ? 'Client mis à jour' : 'Client créé');
    if (r) { onOpenChange(false); onSaved(r.data); }
  };

  const input = (k, label, props = {}) => (
    <Field label={label}><input data-testid={`m-client-form-${k}`} className={inputCls} value={f[k] || ''} onChange={set(k)} {...props} /></Field>
  );

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={client ? 'Modifier le client' : 'Nouveau client'} testId="m-client-form">
      <form onSubmit={save} className="space-y-3">
        {input('full_name', 'Nom complet *', { required: true })}
        {input('email', 'Courriel *', { type: 'email', required: true })}
        {input('phone', 'Téléphone *', { type: 'tel', required: true })}
        {input('address', 'Adresse')}
        <div className="grid grid-cols-2 gap-3">{input('city', 'Ville')}{input('postal_code', 'Code postal')}</div>
        {input('company_name', 'Entreprise')}
        <Field label="Notes">
          <textarea data-testid="m-client-form-notes" rows={2} className={`${inputCls} h-auto py-2`} value={f.notes || ''} onChange={set('notes')} />
        </Field>
        <MButton type="submit" data-testid="m-client-form-submit" loading={busy === 'save'} className="w-full">Enregistrer</MButton>
      </form>
    </BottomSheet>
  );
};
