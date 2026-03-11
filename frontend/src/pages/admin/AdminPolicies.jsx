import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';

const policyTypes = [
  { value: 'terms', label: 'Conditions générales' },
  { value: 'privacy', label: 'Confidentialité' },
  { value: 'warranty', label: 'Garantie' },
  { value: 'cancellation', label: 'Annulation' },
  { value: 'payment', label: 'Paiement' },
];

const emptyForm = { policy_type: 'terms', title: '', content: '', version: '1.0' };

export default function AdminPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPolicies = async () => {
    try {
      const res = await adminApi.getPolicies();
      setPolicies(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPolicies(); }, []);

  const openCreate = () => { setForm(emptyForm); setIsEdit(false); setShowForm(true); };
  const openEdit = (policy) => {
    setSelectedPolicy(policy);
    setForm({ policy_type: policy.policy_type || 'terms', title: policy.title || '', content: policy.content || '', version: policy.version || '1.0' });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) { toast.error('Titre et contenu requis'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await adminApi.updatePolicy(selectedPolicy.id, form);
        toast.success('Politique mise à jour');
      } else {
        await adminApi.createPolicy(form);
        toast.success('Politique créée');
      }
      setShowForm(false);
      fetchPolicies();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await adminApi.deletePolicy(selectedPolicy.id);
      toast.success('Politique supprimée');
      setShowDelete(false);
      fetchPolicies();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    } finally { setSaving(false); }
  };

  const getTypeLabel = (type) => policyTypes.find(t => t.value === type)?.label || type;

  return (
    <div data-testid="admin-policies-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Politiques</h1>
          <p className="text-gray-500">Gérez vos politiques et conditions</p>
        </div>
        <Button onClick={openCreate} className="bg-gold-500 hover:bg-gold-600 text-black font-semibold" data-testid="new-policy-btn">
          <Plus className="h-4 w-4 mr-2" />Nouvelle politique
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {policyTypes.map(t => (
          <Card key={t.value} className="bg-gray-900 border-gray-800 p-4">
            <p className="text-xs text-gray-500 mb-1">{t.label}</p>
            <p className="text-lg font-bold text-white">{policies.filter(p => p.policy_type === t.value).length}</p>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Politique</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Version</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500"><div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>Chargement...</td></tr>
                ) : policies.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Aucune politique. Créez votre première!</td></tr>
                ) : policies.map((policy) => (
                  <tr key={policy.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors" data-testid={`policy-row-${policy.id}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{policy.title}</p>
                      <p className="text-xs text-gray-500">{policy.content?.substring(0, 60)}...</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">{getTypeLabel(policy.policy_type)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">v{policy.version}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${policy.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                        {policy.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(policy)} className="border-gray-700 text-gray-400 hover:bg-gray-800" data-testid={`edit-policy-${policy.id}`}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedPolicy(policy); setShowDelete(true); }} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid={`delete-policy-${policy.id}`}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-gold-500">{isEdit ? 'Modifier la politique' : 'Nouvelle politique'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Type</Label>
                <Select value={form.policy_type} onValueChange={v => setForm(f => ({...f, policy_type: v}))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {policyTypes.map(t => <SelectItem key={t.value} value={t.value} className="text-white hover:bg-gray-700">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-400">Version</Label>
                <Input value={form.version} onChange={e => setForm(f => ({...f, version: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="1.0" />
              </div>
            </div>
            <div>
              <Label className="text-gray-400">Titre *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" data-testid="policy-title-input" />
            </div>
            <div>
              <Label className="text-gray-400">Contenu *</Label>
              <textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} className="w-full h-48 mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm resize-none focus:outline-none focus:border-gold-500" data-testid="policy-content-input" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="save-policy-btn">
              {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-red-400">Supprimer la politique</DialogTitle></DialogHeader>
          <p className="text-gray-400">Supprimer <strong className="text-white">{selectedPolicy?.title}</strong> ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-policy">
              {saving ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
