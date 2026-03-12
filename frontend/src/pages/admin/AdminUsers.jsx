import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Shield, UserCog, CheckCircle, XCircle } from 'lucide-react';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'text-red-400' },
  { value: 'admin', label: 'Admin', color: 'text-gold-500' },
  { value: 'manager', label: 'Manager', color: 'text-blue-400' },
  { value: 'staff', label: 'Staff', color: 'text-gray-400' },
  { value: 'technician', label: 'Technicien', color: 'text-green-400' },
  { value: 'client', label: 'Client', color: 'text-purple-400' },
];

const emptyForm = { full_name: '', email: '', password: '', role: 'staff' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ role: '', is_active: true, full_name: '' });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await adminApi.listUsers();
      setUsers(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.email || !form.password) { toast.error('Email et mot de passe requis'); return; }
    setSaving(true);
    try {
      await adminApi.createUser(form);
      toast.success('Utilisateur créé');
      setShowCreate(false);
      setForm(emptyForm);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await adminApi.updateUser(selected.id, editForm);
      toast.success('Utilisateur mis à jour');
      setShowEdit(false);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (user) => {
    try {
      await adminApi.updateUser(user.id, { is_active: !user.is_active });
      toast.success(user.is_active ? 'Compte désactivé' : 'Compte activé');
      fetchUsers();
    } catch (e) {
      toast.error('Erreur');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error('Mot de passe minimum 6 caractères'); return; }
    setSaving(true);
    try {
      await adminApi.updateUser(selected.id, { password: newPassword });
      toast.success('Mot de passe réinitialisé');
      setShowReset(false);
      setNewPassword('');
    } catch (e) {
      toast.error('Erreur');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await adminApi.deleteUser(selected.id);
      toast.success('Utilisateur supprimé');
      setShowDelete(false);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la suppression');
    } finally { setSaving(false); }
  };

  const getRoleInfo = (role) => ROLES.find(r => r.value === role) || { label: role, color: 'text-gray-400' };

  return (
    <div data-testid="admin-users-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Utilisateurs & Accès</h1>
          <p className="text-gray-500">Gérez les comptes et permissions</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }} className="bg-gold-500 hover:bg-gold-600 text-black font-semibold" data-testid="new-user-btn">
          <Plus className="h-4 w-4 mr-2" />Nouvel utilisateur
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gray-900 border-gray-800 p-5"><p className="text-sm text-gray-500 mb-1">Total</p><p className="text-2xl font-bold text-white">{users.length}</p></Card>
        <Card className="bg-gray-900 border-gray-800 p-5"><p className="text-sm text-gray-500 mb-1">Actifs</p><p className="text-2xl font-bold text-green-400">{users.filter(u => u.is_active).length}</p></Card>
        <Card className="bg-gray-900 border-gray-800 p-5"><p className="text-sm text-gray-500 mb-1">Admins</p><p className="text-2xl font-bold text-gold-500">{users.filter(u => ['admin', 'super_admin'].includes(u.role)).length}</p></Card>
        <Card className="bg-gray-900 border-gray-800 p-5"><p className="text-sm text-gray-500 mb-1">Clients</p><p className="text-2xl font-bold text-purple-400">{users.filter(u => u.role === 'client').length}</p></Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Utilisateur</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Rôle</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500"><div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>Chargement...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">Aucun utilisateur</td></tr>
                ) : users.map((user) => {
                  const roleInfo = getRoleInfo(user.role);
                  return (
                    <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors" data-testid={`user-row-${user.id}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-gold-500/30 to-gold-600/10 border border-gold-500/20 rounded-full flex items-center justify-center text-sm font-bold text-gold-500">
                            {(user.full_name || user.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.full_name || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${roleInfo.color}`}>{roleInfo.label}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleToggleActive(user)} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border transition-colors ${user.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20'}`} data-testid={`toggle-user-${user.id}`}>
                          {user.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setSelected(user); setEditForm({ role: user.role, is_active: user.is_active, full_name: user.full_name || '' }); setShowEdit(true); }} className="border-gray-700 text-gray-400 hover:bg-gray-800" data-testid={`edit-user-${user.id}`}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => { setSelected(user); setShowReset(true); }} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10" data-testid={`reset-pw-${user.id}`}><Shield className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => { setSelected(user); setShowDelete(true); }} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid={`delete-user-${user.id}`}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-gold-500">Nouvel utilisateur</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-gray-400">Nom complet</Label><Input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" /></div>
            <div><Label className="text-gray-400">Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" data-testid="new-user-email" /></div>
            <div><Label className="text-gray-400">Mot de passe *</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" data-testid="new-user-password" /></div>
            <div>
              <Label className="text-gray-400">Rôle</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({...f, role: v}))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {ROLES.filter(r => r.value !== 'super_admin').map(r => <SelectItem key={r.value} value={r.value} className="text-white hover:bg-gray-700">{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="create-user-submit">{saving ? 'Création...' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-gold-500">Modifier {selected?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-gray-400">Nom</Label><Input value={editForm.full_name} onChange={e => setEditForm(f => ({...f, full_name: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" /></div>
            <div>
              <Label className="text-gray-400">Rôle</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({...f, role: v}))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {ROLES.filter(r => r.value !== 'super_admin').map(r => <SelectItem key={r.value} value={r.value} className="text-white hover:bg-gray-700">{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEdit(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black">{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={showReset} onOpenChange={setShowReset}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-blue-400">Réinitialiser le mot de passe</DialogTitle></DialogHeader>
          <p className="text-gray-400 text-sm">Nouveau mot de passe pour <strong className="text-white">{selected?.email}</strong></p>
          <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe (min. 6 caractères)" className="bg-gray-800 border-gray-700 text-white" data-testid="reset-password-input" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReset(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleResetPassword} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">{saving ? 'Réinitialisation...' : 'Réinitialiser'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-red-400">Supprimer l'utilisateur</DialogTitle></DialogHeader>
          <p className="text-gray-400">Supprimer <strong className="text-white">{selected?.full_name || selected?.email}</strong> ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-user">{saving ? 'Suppression...' : 'Supprimer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
