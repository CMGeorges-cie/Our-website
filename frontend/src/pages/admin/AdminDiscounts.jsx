import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

const emptyForm = { code: '', description: '', discount_type: 'percentage', discount_value: '', min_order_amount: 0, max_uses: '', valid_until: '', applicable_services: '', is_active: true };

export default function AdminDiscounts() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCodes = async () => {
    try {
      const res = await adminApi.getDiscountCodes();
      setCodes(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCodes(); }, []);

  const openCreate = () => { setForm(emptyForm); setIsEdit(false); setShowForm(true); };
  const openEdit = (code) => {
    setSelectedCode(code);
    setForm({
      code: code.code || '', description: code.description || '', discount_type: code.discount_type || 'percentage',
      discount_value: String(code.discount_value || ''), min_order_amount: code.min_order_amount || 0,
      max_uses: String(code.max_uses || ''), valid_until: code.valid_until ? code.valid_until.slice(0,10) : '',
      applicable_services: (code.applicable_services || []).join(', '), is_active: code.is_active !== false
    });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.discount_value) { toast.error('Code et valeur requis'); return; }
    setSaving(true);
    try {
      const data = {
        code: form.code.toUpperCase(), description: form.description, discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value), min_order_amount: parseFloat(form.min_order_amount) || 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        applicable_services: form.applicable_services.split(',').map(s => s.trim()).filter(Boolean),
        is_active: form.is_active
      };
      if (isEdit) {
        await adminApi.updateDiscountCode(selectedCode.id, data);
        toast.success('Code promo mis à jour');
      } else {
        await adminApi.createDiscountCode(data);
        toast.success('Code promo créé');
      }
      setShowForm(false);
      fetchCodes();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await adminApi.deleteDiscountCode(selectedCode.id);
      toast.success('Code supprimé');
      setShowDelete(false);
      fetchCodes();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    } finally { setSaving(false); }
  };

  const toggleActive = async (code) => {
    try {
      await adminApi.updateDiscountCode(code.id, { is_active: !code.is_active });
      fetchCodes();
    } catch (e) {
      toast.error('Erreur');
    }
  };

  return (
    <div data-testid="admin-discounts-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Codes Promo</h1>
          <p className="text-gray-500">Gérez vos codes de réduction</p>
        </div>
        <Button onClick={openCreate} className="bg-gold-500 hover:bg-gold-600 text-black font-semibold" data-testid="new-discount-btn">
          <Plus className="h-4 w-4 mr-2" />Nouveau code
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="bg-gray-900 border-gray-800 p-6"><p className="text-sm text-gray-500 mb-1">Total codes</p><p className="text-2xl font-bold text-white">{codes.length}</p></Card>
        <Card className="bg-gray-900 border-gray-800 p-6"><p className="text-sm text-gray-500 mb-1">Actifs</p><p className="text-2xl font-bold text-green-400">{codes.filter(c => c.is_active).length}</p></Card>
        <Card className="bg-gray-900 border-gray-800 p-6"><p className="text-sm text-gray-500 mb-1">Utilisations totales</p><p className="text-2xl font-bold text-gold-500">{codes.reduce((s, c) => s + (c.times_used || 0), 0)}</p></Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Valeur</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Utilisations</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500"><div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>Chargement...</td></tr>
                ) : codes.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Aucun code promo. Créez votre premier!</td></tr>
                ) : codes.map((code) => (
                  <tr key={code.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors" data-testid={`discount-row-${code.id}`}>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-gold-500 bg-gold-500/10 px-2 py-1 rounded">{code.code}</span>
                      {code.description && <p className="text-xs text-gray-500 mt-1">{code.description}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{code.discount_type === 'percentage' ? 'Pourcentage' : 'Montant fixe'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      {code.discount_type === 'percentage' ? `${code.discount_value}%` : `${code.discount_value}$`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {code.times_used || 0}{code.max_uses ? ` / ${code.max_uses}` : ''}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleActive(code)} className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${code.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`} data-testid={`toggle-discount-${code.id}`}>
                        {code.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(code)} className="border-gray-700 text-gray-400 hover:bg-gray-800" data-testid={`edit-discount-${code.id}`}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedCode(code); setShowDelete(true); }} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid={`delete-discount-${code.id}`}><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle className="text-gold-500">{isEdit ? 'Modifier le code promo' : 'Nouveau code promo'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Code *</Label>
                <Input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} className="bg-gray-800 border-gray-700 text-white mt-1 font-mono uppercase" placeholder="PROMO20" data-testid="discount-code-input" />
              </div>
              <div>
                <Label className="text-gray-400">Type</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(f => ({...f, discount_type: v}))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="percentage" className="text-white hover:bg-gray-700">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed" className="text-white hover:bg-gray-700">Montant fixe ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Valeur * {form.discount_type === 'percentage' ? '(%)' : '($)'}</Label>
                <Input type="number" value={form.discount_value} onChange={e => setForm(f => ({...f, discount_value: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="20" data-testid="discount-value-input" />
              </div>
              <div>
                <Label className="text-gray-400">Commande min. ($)</Label>
                <Input type="number" value={form.min_order_amount} onChange={e => setForm(f => ({...f, min_order_amount: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Utilisations max</Label>
                <Input type="number" value={form.max_uses} onChange={e => setForm(f => ({...f, max_uses: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="Illimité" />
              </div>
              <div>
                <Label className="text-gray-400">Valide jusqu'au</Label>
                <Input type="date" value={form.valid_until} onChange={e => setForm(f => ({...f, valid_until: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-gray-400">Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-gray-400">Services applicables (séparés par virgules, vide = tous)</Label>
              <Input value={form.applicable_services} onChange={e => setForm(f => ({...f, applicable_services: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1 text-sm" placeholder="manual, furniture, tech" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="save-discount-btn">
              {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-red-400">Supprimer le code promo</DialogTitle></DialogHeader>
          <p className="text-gray-400">Supprimer le code <strong className="text-white font-mono">{selectedCode?.code}</strong> ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-discount">
              {saving ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
