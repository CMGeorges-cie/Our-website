import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react';

const emptyForm = { name: '', description: '', service_type: 'manual', category: 'general', unit: 'unité', base_price: '', min_price: '', max_price: '', is_active: true };

const serviceTypes = [
  { value: 'manual', label: 'Déco Touché' },
  { value: 'furniture', label: 'Mobilier' },
  { value: 'tech', label: 'Tech' },
];

export default function AdminPricing() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [serviceFilter, setServiceFilter] = useState('all');

  const fetchItems = async () => {
    try {
      const params = {};
      if (serviceFilter !== 'all') params.service_type = serviceFilter;
      const res = await adminApi.getPricingItems(params);
      setItems(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [serviceFilter]);

  const openCreate = () => { setForm(emptyForm); setIsEdit(false); setShowForm(true); };
  const openEdit = (item) => {
    setSelectedItem(item);
    setForm({ name: item.name || '', description: item.description || '', service_type: item.service_type || 'manual', category: item.category || 'general', unit: item.unit || 'unité', base_price: String(item.base_price || ''), min_price: String(item.min_price || ''), max_price: String(item.max_price || ''), is_active: item.is_active !== false });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.base_price) { toast.error('Nom et prix de base requis'); return; }
    setSaving(true);
    try {
      const data = { ...form, base_price: parseFloat(form.base_price), min_price: form.min_price ? parseFloat(form.min_price) : null, max_price: form.max_price ? parseFloat(form.max_price) : null };
      if (isEdit) {
        await adminApi.updatePricingItem(selectedItem.id, data);
        toast.success('Tarif mis à jour');
      } else {
        await adminApi.createPricingItem(data);
        toast.success('Tarif créé');
      }
      setShowForm(false);
      fetchItems();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await adminApi.deletePricingItem(selectedItem.id);
      toast.success('Tarif supprimé');
      setShowDelete(false);
      fetchItems();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    } finally { setSaving(false); }
  };

  const toggleActive = async (item) => {
    try {
      await adminApi.updatePricingItem(item.id, { is_active: !item.is_active });
      fetchItems();
    } catch (e) {
      toast.error('Erreur');
    }
  };

  return (
    <div data-testid="admin-pricing-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Grille Tarifaire</h1>
          <p className="text-gray-500">Gérez vos prix et services</p>
        </div>
        <Button onClick={openCreate} className="bg-gold-500 hover:bg-gold-600 text-black font-semibold" data-testid="new-pricing-btn">
          <Plus className="h-4 w-4 mr-2" />Nouveau tarif
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {serviceTypes.map(s => (
          <Card key={s.value} className="bg-gray-900 border-gray-800 p-6">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">{items.filter(i => i.service_type === s.value).length} tarifs</p>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardContent className="pt-6">
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-full md:w-[200px] bg-gray-800 border-gray-700 text-white" data-testid="pricing-filter">
              <SelectValue placeholder="Filtrer par service" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-white hover:bg-gray-700">Tous les services</SelectItem>
              {serviceTypes.map(s => <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700">{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Nom</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Unité</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Prix de base</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500"><div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>Chargement...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Aucun tarif. Créez votre première entrée!</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors" data-testid={`pricing-row-${item.id}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{serviceTypes.find(s => s.value === item.service_type)?.label || item.service_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{item.unit}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gold-500">{formatCurrency(item.base_price)}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleActive(item)} className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${item.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`} data-testid={`toggle-pricing-${item.id}`}>
                        {item.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(item)} className="border-gray-700 text-gray-400 hover:bg-gray-800" data-testid={`edit-pricing-${item.id}`}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedItem(item); setShowDelete(true); }} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid={`delete-pricing-${item.id}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader><DialogTitle className="text-gold-500">{isEdit ? 'Modifier le tarif' : 'Nouveau tarif'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400">Nom *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" data-testid="pricing-name-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Type de service</Label>
                <Select value={form.service_type} onValueChange={v => setForm(f => ({...f, service_type: v}))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {serviceTypes.map(s => <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-400">Unité</Label>
                <Input value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="unité, heure, pi²" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-400">Prix de base *</Label>
                <Input type="number" value={form.base_price} onChange={e => setForm(f => ({...f, base_price: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="0.00" data-testid="pricing-base-input" />
              </div>
              <div>
                <Label className="text-gray-400">Prix min.</Label>
                <Input type="number" value={form.min_price} onChange={e => setForm(f => ({...f, min_price: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="0.00" />
              </div>
              <div>
                <Label className="text-gray-400">Prix max.</Label>
                <Input type="number" value={form.max_price} onChange={e => setForm(f => ({...f, max_price: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label className="text-gray-400">Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="save-pricing-btn">
              {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-red-400">Supprimer le tarif</DialogTitle></DialogHeader>
          <p className="text-gray-400">Supprimer <strong className="text-white">{selectedItem?.name}</strong> ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-pricing">
              {saving ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
