import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SERVICE_LABELS } from '@/lib/publicData';

const field = 'bg-gray-800 border-gray-700 text-white';

const TermsEditor = ({ k, terms, onChange, onRemove }) => {
  const total = terms.steps.reduce((s, x) => s + (Number(x.percent) || 0), 0);
  const setStep = (i, patch) => onChange({ ...terms, steps: terms.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  return (
    <Card className="bg-gray-900 border-gray-800" data-testid={`terms-editor-${k}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-white">{SERVICE_LABELS[k] || k}</p>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold ${total === 100 ? 'text-emerald-400' : 'text-rose-400'}`} data-testid={`terms-total-${k}`}>Total {total} %</span>
            {onRemove && <Button size="sm" variant="ghost" onClick={onRemove} className="text-rose-400" data-testid={`terms-remove-${k}`}><Trash2 className="h-4 w-4" /></Button>}
          </div>
        </div>
        {terms.steps.map((st, i) => (
          <div key={i} className="flex gap-2">
            <Input data-testid={`terms-${k}-percent-${i}`} className={`${field} w-24`} type="number" value={st.percent} onChange={(e) => setStep(i, { percent: e.target.value === '' ? '' : Number(e.target.value) })} />
            <Input data-testid={`terms-${k}-label-${i}`} className={field} value={st.label} onChange={(e) => setStep(i, { label: e.target.value })} placeholder="à la signature du contrat" />
            <Button variant="ghost" onClick={() => onChange({ ...terms, steps: terms.steps.filter((_, j) => j !== i) })} className="text-gray-500"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={() => onChange({ ...terms, steps: [...terms.steps, { percent: 0, label: '' }] })} data-testid={`terms-${k}-add-step`}>
          <Plus className="h-4 w-4 mr-1" /> Étape
        </Button>
        <Input data-testid={`terms-${k}-note`} className={field} value={terms.small_projects_note} onChange={(e) => onChange({ ...terms, small_projects_note: e.target.value })} placeholder="Note (ex. projets de moins de 500 $ : paiement à la fin)" />
      </CardContent>
    </Card>
  );
};

export const PaymentTermsSection = ({ value, onChange }) => {
  const [newKey, setNewKey] = useState('');
  const available = Object.keys(SERVICE_LABELS).filter((k) => !value[k]);
  return (
    <div className="space-y-3">
      {Object.entries(value).map(([k, t]) => (
        <TermsEditor key={k} k={k} terms={t} onChange={(nt) => onChange({ ...value, [k]: nt })}
          onRemove={k === 'default' ? null : () => { const { [k]: _, ...rest } = value; onChange(rest); }} />
      ))}
      {available.length > 0 && (
        <div className="flex gap-2">
          <select data-testid="terms-new-service" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="h-10 rounded-md bg-gray-800 border border-gray-700 text-white px-3 text-sm">
            <option value="">Règle spécifique pour un service…</option>
            {available.map((k) => <option key={k} value={k}>{SERVICE_LABELS[k]}</option>)}
          </select>
          <Button disabled={!newKey} variant="outline" className="border-gray-700 text-gray-300" data-testid="terms-add-service"
            onClick={() => { onChange({ ...value, [newKey]: { steps: [{ percent: 100, label: 'à la fin des travaux' }], small_projects_note: '' } }); setNewKey(''); }}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>
      )}
    </div>
  );
};

export const ReviewsSection = ({ value, onChange }) => {
  const set = (patch) => onChange({ ...value, ...patch });
  const setItem = (i, patch) => set({ items: value.items.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" checked={value.enabled} onChange={(e) => set({ enabled: e.target.checked })} data-testid="reviews-enabled" /> Afficher la section avis sur l'accueil
      </label>
      <Input data-testid="reviews-google-url" className={field} value={value.google_url} onChange={(e) => set({ google_url: e.target.value })} placeholder="Lien de votre fiche Google (avis)" />
      <div className="grid grid-cols-2 gap-2">
        <Input data-testid="reviews-google-rating" className={field} type="number" step="0.1" min="1" max="5" value={value.google_rating ?? ''} onChange={(e) => set({ google_rating: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Note Google (ex. 4.9)" />
        <Input data-testid="reviews-google-count" className={field} type="number" value={value.google_count ?? ''} onChange={(e) => set({ google_count: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Nombre d'avis Google" />
      </div>
      {value.items.map((r, i) => (
        <Card key={i} className="bg-gray-900 border-gray-800" data-testid={`review-${i}`}>
          <CardContent className="p-3 space-y-2">
            <div className="flex gap-2">
              <Input className={field} value={r.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder="Nom" data-testid={`review-${i}-name`} />
              <Input className={field} value={r.city} onChange={(e) => setItem(i, { city: e.target.value })} placeholder="Ville" />
              <Input className={`${field} w-20`} type="number" min="1" max="5" value={r.rating} onChange={(e) => setItem(i, { rating: Number(e.target.value) || 5 })} />
              <Button variant="ghost" className="text-rose-400" onClick={() => set({ items: value.items.filter((_, j) => j !== i) })} data-testid={`review-${i}-remove`}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <textarea className="w-full rounded-md bg-gray-800 border border-gray-700 text-white p-2 text-sm" rows={2} value={r.text} onChange={(e) => setItem(i, { text: e.target.value })} placeholder="Texte de l'avis (copié de Google)" data-testid={`review-${i}-text`} />
          </CardContent>
        </Card>
      ))}
      <Button size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={() => set({ items: [...value.items, { name: '', city: '', text: '', rating: 5 }] })} data-testid="review-add">
        <Plus className="h-4 w-4 mr-1" /> Ajouter un avis
      </Button>
    </div>
  );
};

export const TrustSection = ({ value, onChange }) => (
  <div className="space-y-3">
    <label className="flex items-center gap-2 text-sm text-gray-300">
      <input type="checkbox" checked={value.insured} onChange={(e) => onChange({ ...value, insured: e.target.checked })} data-testid="trust-insured" /> Afficher « Assuré »
    </label>
    <Input data-testid="trust-insurance-text" className={field} value={value.insurance_text} onChange={(e) => onChange({ ...value, insurance_text: e.target.value })} placeholder="Texte assurance" />
    <Input data-testid="trust-clients-count" className={field} value={value.clients_count} onChange={(e) => onChange({ ...value, clients_count: e.target.value })} placeholder="Nombre de clients affiché (vide = masqué), ex. 150+" />
  </div>
);
