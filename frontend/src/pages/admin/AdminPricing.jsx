import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { 
  Search, 
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Paintbrush,
  Sofa,
  Code,
  CheckCircle,
  XCircle
} from 'lucide-react';

const serviceIcons = {
  manual: Paintbrush,
  furniture: Sofa,
  tech: Code
};

const serviceLabels = {
  manual: 'Déco Touché',
  furniture: 'Mobilier',
  tech: 'Tech'
};

const emptyItem = {
  name: '',
  description: '',
  service_type: 'manual',
  category: 'general',
  unit: 'unité',
  base_price: 0,
  min_price: null,
  max_price: null
};

export default function AdminPricing() {
  usePageTitle('Grille Tarifaire');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('manual');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(emptyItem);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      const response = await adminApi.getPricingItems();
      setItems(response.data || []);
    } catch (error) {
      console.error('Error fetching pricing items:', error);
      toast.error('Erreur lors du chargement de la grille tarifaire');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = items.filter(item =>
    item.service_type === activeTab &&
    (item.name?.toLowerCase().includes(search.toLowerCase()) ||
     item.description?.toLowerCase().includes(search.toLowerCase()) ||
     item.category?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({ ...emptyItem, service_type: activeTab });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      service_type: item.service_type,
      category: item.category || 'general',
      unit: item.unit || 'unité',
      base_price: item.base_price,
      min_price: item.min_price,
      max_price: item.max_price
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.base_price) {
      toast.error('Veuillez remplir le nom et le prix de base');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await adminApi.updatePricingItem(editingItem.id, formData);
        toast.success('Tarif mis à jour');
      } else {
        await adminApi.createPricingItem(formData);
        toast.success('Tarif créé');
      }
      setShowModal(false);
      fetchItems();
    } catch (error) {
      console.error('Error saving pricing item:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Supprimer ce tarif?')) return;
    
    try {
      await adminApi.deletePricingItem(itemId);
      toast.success('Tarif supprimé');
      fetchItems();
    } catch (error) {
      console.error('Error deleting pricing item:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await adminApi.updatePricingItem(item.id, { is_active: !item.is_active });
      toast.success(item.is_active ? 'Tarif désactivé' : 'Tarif activé');
      fetchItems();
    } catch (error) {
      console.error('Error toggling pricing item:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      general: 'Général',
      peinture: 'Peinture',
      plancher: 'Plancher',
      installation: 'Installation',
      assemblage: 'Assemblage',
      livraison: 'Livraison',
      web: 'Web',
      devops: 'DevOps',
      maintenance: 'Maintenance'
    };
    return labels[cat] || cat;
  };

  return (
    <div data-testid="admin-pricing-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Grille Tarifaire</h1>
          <p className="text-gray-500">Gérez vos prix et tarifs par service</p>
        </div>
        <Button 
          className="bg-gold-500 hover:bg-gold-600 text-black font-semibold"
          onClick={handleCreate}
          data-testid="create-pricing-item-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau tarif
        </Button>
      </div>

      {/* Service Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-gray-900 border border-gray-800">
          {Object.entries(serviceLabels).map(([key, label]) => {
            const Icon = serviceIcons[key];
            return (
              <TabsTrigger 
                key={key} 
                value={key}
                className="data-[state=active]:bg-gold-500 data-[state=active]:text-black"
                data-testid={`tab-${key}`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input 
              placeholder="Rechercher un tarif..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-gold-500"
              data-testid="pricing-search"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="pricing-table">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégorie</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unité</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Prix de base</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Fourchette</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      Chargement...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      Aucun tarif trouvé pour ce service
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr 
                      key={item.id} 
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                      data-testid={`pricing-row-${item.id}`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-300">
                          {getCategoryLabel(item.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {item.unit}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-gold-500 text-lg">
                          {formatCurrency(item.base_price)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-400">
                        {item.min_price || item.max_price ? (
                          <>
                            {item.min_price ? formatCurrency(item.min_price) : '-'}
                            {' → '}
                            {item.max_price ? formatCurrency(item.max_price) : '-'}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            item.is_active 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                          data-testid={`toggle-active-${item.id}`}
                        >
                          {item.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10"
                            onClick={() => handleEdit(item)}
                            data-testid={`edit-item-${item.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                            onClick={() => handleDelete(item.id)}
                            data-testid={`delete-item-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editingItem ? 'Modifier le tarif' : 'Nouveau tarif'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Nom du service *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Peinture 3½ pièces"
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="input-name"
              />
            </div>

            <div>
              <Label className="text-gray-300">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description du service..."
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="input-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Type de service</Label>
                <Select 
                  value={formData.service_type} 
                  onValueChange={(v) => setFormData({...formData, service_type: v})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-service-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="manual">Déco Touché</SelectItem>
                    <SelectItem value="furniture">Mobilier</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Catégorie</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({...formData, category: v})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="general">Général</SelectItem>
                    <SelectItem value="peinture">Peinture</SelectItem>
                    <SelectItem value="plancher">Plancher</SelectItem>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="assemblage">Assemblage</SelectItem>
                    <SelectItem value="livraison">Livraison</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="devops">DevOps</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Unité</Label>
                <Select 
                  value={formData.unit} 
                  onValueChange={(v) => setFormData({...formData, unit: v})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="unité">Unité</SelectItem>
                    <SelectItem value="heure">Heure</SelectItem>
                    <SelectItem value="pied carré">Pied carré</SelectItem>
                    <SelectItem value="pièce">Pièce</SelectItem>
                    <SelectItem value="forfait">Forfait</SelectItem>
                    <SelectItem value="mois">Mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Prix de base ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData({...formData, base_price: parseFloat(e.target.value) || 0})}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-base-price"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Prix min. ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.min_price || ''}
                  onChange={(e) => setFormData({...formData, min_price: e.target.value ? parseFloat(e.target.value) : null})}
                  placeholder="Optionnel"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-min-price"
                />
              </div>
              <div>
                <Label className="text-gray-300">Prix max. ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.max_price || ''}
                  onChange={(e) => setFormData({...formData, max_price: e.target.value ? parseFloat(e.target.value) : null})}
                  placeholder="Optionnel"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-max-price"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowModal(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-gold-500 hover:bg-gold-600 text-black font-semibold"
              data-testid="save-item-btn"
            >
              {saving ? 'Sauvegarde...' : (editingItem ? 'Mettre à jour' : 'Créer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
