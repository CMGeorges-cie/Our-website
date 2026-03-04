import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { 
  Search, 
  Plus,
  Pencil,
  Trash2,
  Tag,
  Percent,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';

const emptyCode = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: 0,
  max_uses: null,
  valid_from: '',
  valid_until: '',
  applicable_services: []
};

export default function AdminDiscountCodes() {
  usePageTitle('Codes Promo');
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [formData, setFormData] = useState(emptyCode);
  const [saving, setSaving] = useState(false);

  const fetchCodes = async () => {
    try {
      const response = await adminApi.getDiscountCodes();
      setCodes(response.data || []);
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      toast.error('Erreur lors du chargement des codes promo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const filteredCodes = codes.filter(code =>
    code.code?.toLowerCase().includes(search.toLowerCase()) ||
    code.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setEditingCode(null);
    setFormData(emptyCode);
    setShowModal(true);
  };

  const handleEdit = (code) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description || '',
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      min_order_amount: code.min_order_amount || 0,
      max_uses: code.max_uses || null,
      valid_from: code.valid_from ? code.valid_from.split('T')[0] : '',
      valid_until: code.valid_until ? code.valid_until.split('T')[0] : '',
      applicable_services: code.applicable_services || []
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.discount_value) {
      toast.error('Veuillez remplir le code et la valeur');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null
      };

      if (editingCode) {
        await adminApi.updateDiscountCode(editingCode.id, payload);
        toast.success('Code promo mis à jour');
      } else {
        await adminApi.createDiscountCode(payload);
        toast.success('Code promo créé');
      }
      setShowModal(false);
      fetchCodes();
    } catch (error) {
      console.error('Error saving discount code:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (codeId) => {
    if (!confirm('Supprimer ce code promo?')) return;
    
    try {
      await adminApi.deleteDiscountCode(codeId);
      toast.success('Code promo supprimé');
      fetchCodes();
    } catch (error) {
      console.error('Error deleting discount code:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (code) => {
    try {
      await adminApi.updateDiscountCode(code.id, { is_active: !code.is_active });
      toast.success(code.is_active ? 'Code désactivé' : 'Code activé');
      fetchCodes();
    } catch (error) {
      console.error('Error toggling discount code:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-CA');
  };

  return (
    <div data-testid="admin-discount-codes-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Codes Promo</h1>
          <p className="text-gray-500">Gérez vos codes de réduction</p>
        </div>
        <Button 
          className="bg-gold-500 hover:bg-gold-600 text-black font-semibold"
          onClick={handleCreate}
          data-testid="create-discount-code-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau code
        </Button>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input 
              placeholder="Rechercher un code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-gold-500"
              data-testid="discount-code-search"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="discount-codes-table">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Réduction</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Validité</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisations</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      Chargement...
                    </td>
                  </tr>
                ) : filteredCodes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      Aucun code promo trouvé
                    </td>
                  </tr>
                ) : (
                  filteredCodes.map((code) => (
                    <tr 
                      key={code.id} 
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                      data-testid={`discount-code-row-${code.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-gold-500" />
                          <span className="font-mono font-bold text-white">{code.code}</span>
                        </div>
                        {code.description && (
                          <p className="text-xs text-gray-500 mt-1">{code.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-gold-500 font-semibold">
                          {code.discount_type === 'percentage' ? (
                            <>
                              <Percent className="h-4 w-4" />
                              {code.discount_value}%
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4" />
                              {code.discount_value}$
                            </>
                          )}
                        </div>
                        {code.min_order_amount > 0 && (
                          <p className="text-xs text-gray-500">Min: {code.min_order_amount}$</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(code.valid_from)} → {formatDate(code.valid_until)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-white font-medium">{code.times_used || 0}</span>
                        {code.max_uses && (
                          <span className="text-gray-500"> / {code.max_uses}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(code)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            code.is_active 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                          data-testid={`toggle-active-${code.id}`}
                        >
                          {code.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10"
                            onClick={() => handleEdit(code)}
                            data-testid={`edit-code-${code.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                            onClick={() => handleDelete(code.id)}
                            data-testid={`delete-code-${code.id}`}
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
              {editingCode ? 'Modifier le code promo' : 'Nouveau code promo'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                placeholder="PROMO2026"
                className="bg-gray-800 border-gray-700 text-white font-mono"
                data-testid="input-code"
              />
            </div>

            <div>
              <Label className="text-gray-300">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description du code..."
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="input-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Type</Label>
                <Select 
                  value={formData.discount_type} 
                  onValueChange={(v) => setFormData({...formData, discount_type: v})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed">Montant fixe ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Valeur *</Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-value"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Commande min. ($)</Label>
                <Input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({...formData, min_order_amount: parseFloat(e.target.value) || 0})}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-min-order"
                />
              </div>
              <div>
                <Label className="text-gray-300">Utilisations max.</Label>
                <Input
                  type="number"
                  value={formData.max_uses || ''}
                  onChange={(e) => setFormData({...formData, max_uses: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="Illimité"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-max-uses"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Valide à partir du</Label>
                <Input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-valid-from"
                />
              </div>
              <div>
                <Label className="text-gray-300">Valide jusqu'au</Label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-valid-until"
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
              data-testid="save-code-btn"
            >
              {saving ? 'Sauvegarde...' : (editingCode ? 'Mettre à jour' : 'Créer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
