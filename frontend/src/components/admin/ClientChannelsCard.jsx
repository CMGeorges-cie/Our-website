import { useState } from 'react';
import { toast } from 'sonner';
import { MessageCircle, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/lib/api';
import { CHANNELS } from '@/mobile/components/ContactActions';

const SOURCES = ['Site web', 'Google', 'Facebook', 'Instagram', 'TikTok', 'Bouche-à-oreille', 'Kijiji / Marketplace', 'Autre'];
const sel = 'h-10 w-full rounded-md bg-gray-800 border border-gray-700 text-white px-3 text-sm';

export const ClientChannelsCard = ({ client, onSaved }) => {
  const [ch, setCh] = useState({ ...(client.contact_channels || {}) });
  const [preferred, setPreferred] = useState(client.preferred_channel || '');
  const [source, setSource] = useState(client.source || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await adminApi.updateClient(client.id, {
        contact_channels: Object.fromEntries(Object.entries(ch).filter(([, v]) => v?.trim())),
        preferred_channel: preferred,
        source,
      });
      onSaved(data);
      toast.success('Moyens de contact enregistrés');
    } catch {
      toast.error('Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800" data-testid="client-channels-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2"><MessageCircle className="h-5 w-5 text-gold-500" /> Moyens de contact & source</CardTitle>
        <Button size="sm" onClick={save} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="client-channels-save"><Save className="h-4 w-4 mr-1" /> Enregistrer</Button>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-3 gap-3">
        {Object.entries(CHANNELS).map(([k, c]) => (
          <label key={k} className="text-xs text-gray-400 space-y-1">
            <span>{c.label}</span>
            <Input data-testid={`client-channel-${k}`} className="bg-gray-800 border-gray-700 text-white" placeholder={c.hint} value={ch[k] || ''} onChange={(e) => setCh({ ...ch, [k]: e.target.value })} />
          </label>
        ))}
        <label className="text-xs text-gray-400 space-y-1">
          <span>Moyen préféré</span>
          <select data-testid="client-preferred-channel" className={sel} value={preferred} onChange={(e) => setPreferred(e.target.value)}>
            <option value="">—</option>
            <option value="phone">Téléphone</option>
            <option value="sms">Texto</option>
            <option value="email">Courriel</option>
            {Object.entries(CHANNELS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-400 space-y-1">
          <span>Comment nous a-t-il connus ?</span>
          <select data-testid="client-source" className={sel} value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">—</option>
            {[...new Set([source, ...SOURCES].filter(Boolean))].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
      </CardContent>
    </Card>
  );
};
