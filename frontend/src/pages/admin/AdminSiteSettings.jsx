import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { PaymentTermsSection, ReviewsSection, TrustSection } from '@/components/admin/SiteSettingsSections';
import { TestDataCleanup } from '@/components/admin/TestDataCleanup';

const Block = ({ title, desc, children }) => (
  <section className="mb-10">
    <h2 className="text-lg font-bold text-white font-['Outfit']">{title}</h2>
    {desc && <p className="text-sm text-gray-500 mb-4">{desc}</p>}
    {children}
  </section>
);

export default function AdminSiteSettings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/site-settings').then((r) => setS(r.data)).catch(() => toast.error('Chargement impossible'));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/admin/site-settings', s);
      setS(data);
      toast.success('Paramètres enregistrés — le site public est à jour');
    } catch (e) {
      toast.error(e.response?.data?.detail?.toString() || 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (!s) return <Loader2 className="h-6 w-6 animate-spin text-gray-500" />;

  return (
    <div data-testid="admin-site-settings-page" className="max-w-3xl">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Paramètres du site</h1>
          <p className="text-gray-500">Une seule source pour tout le site public. Les prix se gèrent dans le Catalogue.</p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black font-semibold" data-testid="site-settings-save">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Enregistrer
        </Button>
      </div>
      <Block title="Modalités de paiement" desc="Règle par défaut + règles spécifiques par service (catégories du catalogue). Chaque règle doit totaliser 100 %.">
        <PaymentTermsSection value={s.payment_terms} onChange={(payment_terms) => setS({ ...s, payment_terms })} />
      </Block>
      <Block title="Avis clients & Google" desc="Copiez vos vrais avis Google et le lien de votre fiche. Laissez vide pour masquer.">
        <ReviewsSection value={s.reviews} onChange={(reviews) => setS({ ...s, reviews })} />
      </Block>
      <Block title="Confiance">
        <TrustSection value={s.trust} onChange={(trust) => setS({ ...s, trust })} />
      </Block>
      <Block title="Nettoyer les données de test">
        <TestDataCleanup />
      </Block>
    </div>
  );
}
