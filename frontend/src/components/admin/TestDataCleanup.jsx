import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Trash2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

const MARKABLE = ['service_catalog', 'pricing_items', 'blog_posts', 'policies', 'social_posts', 'clients', 'leads', 'projects', 'discount_codes'];

export const TestDataCleanup = () => {
  const [groups, setGroups] = useState(null);
  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);

  const scan = async () => {
    setBusy(true);
    try {
      const { data } = await api.get('/admin/test-data');
      setGroups(data);
      setSelected(Object.fromEntries(data.map((g) => [g.collection, []])));
    } catch {
      toast.error('Analyse impossible');
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { scan(); }, []);

  const toggle = (coll, id) => setSelected((s) => ({
    ...s, [coll]: s[coll].includes(id) ? s[coll].filter((x) => x !== id) : [...s[coll], id],
  }));
  const markReal = async (collection, id) => {
    try {
      await api.post('/admin/test-data/mark-real', { collection, id });
      toast.success('Dossier protégé : il ne sera plus jamais proposé');
      await scan();
    } catch {
      toast.error('Protection impossible');
    }
  };
  const count = Object.values(selected).reduce((n, l) => n + l.length, 0);

  const purge = async () => {
    if (!window.confirm(`Supprimer définitivement ${count} élément(s) de test ?`)) return;
    setBusy(true);
    try {
      const { data } = await api.post('/admin/test-data/purge', { ids: selected });
      toast.success(`${data.total} élément(s) supprimé(s)`);
      await scan();
    } catch {
      toast.error('Suppression impossible');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="test-data-cleanup">
      <p className="text-sm text-gray-400">Éléments détectés comme tests ou démos (nom « TEST… », « Playwright », « Updated Title », courriels @example.com, liens « example »). Les clients et leads ayant un projet, une facture, une soumission ou des photos ne sont jamais proposés. Rien n'est coché par défaut : cochez seulement ce qui est vraiment un test, ou protégez un dossier avec « Réel ».</p>
      {groups === null ? <Loader2 className="h-5 w-5 animate-spin text-gray-500" /> : groups.length === 0 ? (
        <p className="text-sm text-emerald-400" data-testid="test-data-empty">Aucune donnée de test détectée.</p>
      ) : groups.map((g) => (
        <Card key={g.collection} className="bg-gray-900 border-gray-800" data-testid={`test-group-${g.collection}`}>
          <CardContent className="p-3">
            <p className="text-sm font-semibold text-white mb-2">{g.label} ({g.items.length})</p>
            <div className="flex flex-wrap gap-2">
              {g.items.map((i) => (
                <span key={i.id} className="flex items-center gap-1.5 text-xs text-gray-300 bg-gray-800 rounded pl-2 pr-1 py-1">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={selected[g.collection]?.includes(i.id)} onChange={() => toggle(g.collection, i.id)} data-testid={`test-item-${i.id}`} />
                    {i.label}
                  </label>
                  {MARKABLE.includes(g.collection) && (
                    <button onClick={() => markReal(g.collection, i.id)} disabled={busy} className="ml-1 rounded bg-emerald-600/20 text-emerald-300 px-1.5 py-0.5 hover:bg-emerald-600/40" data-testid={`test-mark-real-${i.id}`}>
                      Réel
                    </button>
                  )}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" className="border-gray-700 text-gray-300" onClick={scan} disabled={busy} data-testid="test-data-rescan"><Search className="h-4 w-4 mr-1" /> Réanalyser</Button>
        {groups?.length > 0 && (
          <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={purge} disabled={busy || count === 0} data-testid="test-data-purge">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />} Nettoyer {count} élément(s)
          </Button>
        )}
      </div>
    </div>
  );
};
