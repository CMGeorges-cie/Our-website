import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { MButton, Field, inputCls } from './MUi';
import { BottomSheet } from './BottomSheet';
import { useAction } from './useLoad';
import { CHANNELS } from './ContactActions';

const EMPTY = { full_name: '', email: '', phone: '', address: '', city: '', postal_code: '', company_name: '', notes: '', source: '', preferred_channel: '' };
const SOURCES = ['Site web', 'Google', 'Facebook', 'Instagram', 'TikTok', 'Bouche-à-oreille', 'Kijiji / Marketplace', 'Autre'];

export const ClientForm = ({ open, onOpenChange, client, onSaved }) => {
  const [f, setF] = useState(() => ({ ...EMPTY, ...(client || {}) }));
  const [ch, setCh] = useState(() => ({ ...(client?.contact_channels || {}) }));
  const { busy, run } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(Object.keys(EMPTY).map((k) => [k, f[k] || '']));
    if (!body.company_name) body.company_name = null;
    body.contact_channels = Object.fromEntries(Object.entries(ch).filter(([, v]) => v?.trim()));
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
        <Field label="Comment nous a-t-il connus ?">
          <select data-testid="m-client-form-source" className={inputCls} value={f.source || ''} onChange={set('source')}>
            <option value="">—</option>
            {[...new Set([f.source, ...SOURCES].filter(Boolean))].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>
        <p className="text-xs font-medium text-slate-400 pt-1">Autres moyens de contact</p>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(CHANNELS).map(([k, c]) => (
            <Field key={k} label={c.label}>
              <input data-testid={`m-client-form-channel-${k}`} className={inputCls} placeholder={c.hint} value={ch[k] || ''} onChange={(e) => setCh({ ...ch, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
        <Field label="Moyen préféré">
          <select data-testid="m-client-form-preferred" className={inputCls} value={f.preferred_channel || ''} onChange={set('preferred_channel')}>
            <option value="">—</option>
            <option value="phone">Téléphone</option>
            <option value="sms">Texto</option>
            <option value="email">Courriel</option>
            {Object.entries(CHANNELS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <textarea data-testid="m-client-form-notes" rows={2} className={`${inputCls} h-auto py-2`} value={f.notes || ''} onChange={set('notes')} />
        </Field>
        <MButton type="submit" data-testid="m-client-form-submit" loading={busy === 'save'} className="w-full">Enregistrer</MButton>
      </form>
    </BottomSheet>
  );
};
