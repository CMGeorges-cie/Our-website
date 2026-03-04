import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  FileText,
  Shield,
  ScrollText,
  CreditCard,
  XCircle,
  Eye
} from 'lucide-react';

const policyTypeIcons = {
  terms: ScrollText,
  privacy: Shield,
  warranty: FileText,
  cancellation: XCircle,
  payment: CreditCard
};

const policyTypeLabels = {
  terms: 'Conditions générales',
  privacy: 'Politique de confidentialité',
  warranty: 'Garantie',
  cancellation: 'Annulation',
  payment: 'Paiement'
};

const emptyPolicy = {
  policy_type: 'terms',
  title: '',
  content: '',
  version: '1.0'
};

export default function AdminPolicies() {
  usePageTitle('Politiques');
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [viewingPolicy, setViewingPolicy] = useState(null);
  const [formData, setFormData] = useState(emptyPolicy);
  const [saving, setSaving] = useState(false);

  const fetchPolicies = async () => {
    try {
      const response = await adminApi.getPolicies();
      setPolicies(response.data || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
      toast.error('Erreur lors du chargement des politiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const filteredPolicies = policies.filter(policy =>
    policy.title?.toLowerCase().includes(search.toLowerCase()) ||
    policy.policy_type?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setEditingPolicy(null);
    setFormData(emptyPolicy);
    setShowModal(true);
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      policy_type: policy.policy_type,
      title: policy.title,
      content: policy.content || '',
      version: policy.version || '1.0'
    });
    setShowModal(true);
  };

  const handleView = (policy) => {
    setViewingPolicy(policy);
    setShowViewModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Veuillez remplir le titre et le contenu');
      return;
    }

    setSaving(true);
    try {
      if (editingPolicy) {
        await adminApi.updatePolicy(editingPolicy.id, formData);
        toast.success('Politique mise à jour');
      } else {
        await adminApi.createPolicy(formData);
        toast.success('Politique créée');
      }
      setShowModal(false);
      fetchPolicies();
    } catch (error) {
      console.error('Error saving policy:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (policyId) => {
    if (!confirm('Supprimer cette politique?')) return;
    
    try {
      await adminApi.deletePolicy(policyId);
      toast.success('Politique supprimée');
      fetchPolicies();
    } catch (error) {
      console.error('Error deleting policy:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (policy) => {
    try {
      await adminApi.updatePolicy(policy.id, { is_active: !policy.is_active });
      toast.success(policy.is_active ? 'Politique désactivée' : 'Politique activée');
      fetchPolicies();
    } catch (error) {
      console.error('Error toggling policy:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-CA');
  };

  return (
    <div data-testid="admin-policies-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Politiques</h1>
          <p className="text-gray-500">Gérez vos politiques et conditions</p>
        </div>
        <Button 
          className="bg-gold-500 hover:bg-gold-600 text-black font-semibold"
          onClick={handleCreate}
          data-testid="create-policy-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle politique
        </Button>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input 
              placeholder="Rechercher une politique..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-gold-500"
              data-testid="policy-search"
            />
          </div>

          {/* Grid */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              Chargement...
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              Aucune politique trouvée
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="policies-grid">
              {filteredPolicies.map((policy) => {
                const Icon = policyTypeIcons[policy.policy_type] || FileText;
                return (
                  <Card 
                    key={policy.id} 
                    className="bg-gray-800 border-gray-700 hover:border-gold-500/50 transition-all"
                    data-testid={`policy-card-${policy.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-gold-500" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{policy.title}</h3>
                            <p className="text-xs text-gray-500">
                              {policyTypeLabels[policy.policy_type]} • v{policy.version}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleActive(policy)}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            policy.is_active 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}
                          data-testid={`toggle-active-${policy.id}`}
                        >
                          {policy.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                        {policy.content?.substring(0, 150)}...
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Mis à jour: {formatDate(policy.updated_at)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-white hover:bg-gray-700"
                            onClick={() => handleView(policy)}
                            data-testid={`view-policy-${policy.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gold-500 hover:text-gold-400 hover:bg-gold-500/10"
                            onClick={() => handleEdit(policy)}
                            data-testid={`edit-policy-${policy.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDelete(policy.id)}
                            data-testid={`delete-policy-${policy.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              {viewingPolicy && (
                <>
                  {(() => {
                    const Icon = policyTypeIcons[viewingPolicy.policy_type] || FileText;
                    return <Icon className="h-5 w-5 text-gold-500" />;
                  })()}
                  {viewingPolicy.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {viewingPolicy && (
            <div className="py-4">
              <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                <span>Type: {policyTypeLabels[viewingPolicy.policy_type]}</span>
                <span>Version: {viewingPolicy.version}</span>
              </div>
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-gray-300">
                  {viewingPolicy.content}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editingPolicy ? 'Modifier la politique' : 'Nouvelle politique'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Type *</Label>
                <Select 
                  value={formData.policy_type} 
                  onValueChange={(v) => setFormData({...formData, policy_type: v})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {Object.entries(policyTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Version</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({...formData, version: e.target.value})}
                  placeholder="1.0"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-version"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Titre *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Titre de la politique"
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="input-title"
              />
            </div>

            <div>
              <Label className="text-gray-300">Contenu *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Contenu de la politique..."
                rows={12}
                className="bg-gray-800 border-gray-700 text-white resize-y"
                data-testid="input-content"
              />
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
              data-testid="save-policy-btn"
            >
              {saving ? 'Sauvegarde...' : (editingPolicy ? 'Mettre à jour' : 'Créer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
