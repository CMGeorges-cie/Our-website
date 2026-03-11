import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Search, Users, Mail, Phone, Eye, Plus, Pencil, Trash2 } from 'lucide-react';

const emptyForm = { full_name: '', email: '', phone: '', address: '', city: '', postal_code: '', company_name: '', notes: '', status: 'active' };

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    try {
      const response = await adminApi.getClients();
      setClients(response.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const openCreate = () => { setForm(emptyForm); setShowCreate(true); };
  const openEdit = (client) => {
    setSelectedClient(client);
    setForm({ full_name: client.full_name || '', email: client.email || '', phone: client.phone || '', address: client.address || '', city: client.city || '', postal_code: client.postal_code || '', company_name: client.company_name || '', notes: client.notes || '', status: client.status || 'active' });
    setShowEdit(true);
  };
  const openDelete = (client) => { setSelectedClient(client); setShowDelete(true); };

  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.phone) { toast.error('Nom, email et téléphone requis'); return; }
    setSaving(true);
    try {
      await adminApi.createClient(form);
      toast.success('Client créé avec succès');
      setShowCreate(false);
      fetchClients();
    } catch (e) {
      toast.error('Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!form.full_name || !form.email || !form.phone) { toast.error('Nom, email et téléphone requis'); return; }
    setSaving(true);
    try {
      await adminApi.updateClient(selectedClient.id, form);
      toast.success('Client mis à jour');
      setShowEdit(false);
      fetchClients();
    } catch (e) {
      toast.error('Erreur lors de la mise à jour');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await adminApi.deleteClient(selectedClient.id);
      toast.success('Client supprimé');
      setShowDelete(false);
      fetchClients();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    } finally { setSaving(false); }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'inactive': return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    }
  };

  const ClientForm = ({ onSubmit, submitLabel }) => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label className="text-gray-400">Nom complet *</Label>
        <Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="bg-gray-800 border-gray-700 text-white mt-1" data-testid="client-form-name" />
      </div>
      <div>
        <Label className="text-gray-400">Email *</Label>
        <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-gray-800 border-gray-700 text-white mt-1" data-testid="client-form-email" />
      </div>
      <div>
        <Label className="text-gray-400">Téléphone *</Label>
        <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-gray-800 border-gray-700 text-white mt-1" data-testid="client-form-phone" />
      </div>
      <div>
        <Label className="text-gray-400">Adresse</Label>
        <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="bg-gray-800 border-gray-700 text-white mt-1" />
      </div>
      <div>
        <Label className="text-gray-400">Ville</Label>
        <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="bg-gray-800 border-gray-700 text-white mt-1" />
      </div>
      <div>
        <Label className="text-gray-400">Code postal</Label>
        <Input value={form.postal_code} onChange={e => setForm({...form, postal_code: e.target.value})} className="bg-gray-800 border-gray-700 text-white mt-1" />
      </div>
      <div>
        <Label className="text-gray-400">Entreprise</Label>
        <Input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className="bg-gray-800 border-gray-700 text-white mt-1" />
      </div>
      <div className="col-span-2">
        <Label className="text-gray-400">Notes</Label>
        <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="bg-gray-800 border-gray-700 text-white mt-1" />
      </div>
      <DialogFooter className="col-span-2 mt-2">
        <Button variant="outline" onClick={() => { setShowCreate(false); setShowEdit(false); }} className="border-gray-700 text-gray-400">Annuler</Button>
        <Button onClick={onSubmit} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="client-form-submit">
          {saving ? 'Enregistrement...' : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div data-testid="admin-clients-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Clients</h1>
          <p className="text-gray-500">Gérez votre base de clients</p>
        </div>
        <Button onClick={openCreate} className="bg-gold-500 hover:bg-gold-600 text-black font-semibold" data-testid="new-client-btn">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau client
        </Button>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input placeholder="Rechercher par nom, email, téléphone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-gold-500" data-testid="client-search" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="clients-table">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Ville</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Revenus</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>Chargement...
                  </td></tr>
                ) : filteredClients.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Aucun client trouvé</td></tr>
                ) : filteredClients.map((client) => (
                  <tr key={client.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors" data-testid={`client-row-${client.id}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{client.full_name}</p>
                      {client.company_name && <p className="text-xs text-gray-500">{client.company_name}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-gold-500" />{client.email}</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-gold-500" />{client.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{client.city || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusClass(client.status)}`}>
                        {client.status === 'active' ? 'Actif' : client.status === 'inactive' ? 'Inactif' : 'Prospect'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-gold-500">{formatCurrency(client.total_revenue || 0)}</span>
                      <span className="block text-xs text-gray-500">{client.total_projects || 0} projet(s)</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/clients/${client.id}`}>
                          <Button variant="outline" size="sm" className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10" data-testid={`view-client-${client.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => openEdit(client)} className="border-gray-700 text-gray-400 hover:bg-gray-800" data-testid={`edit-client-${client.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openDelete(client)} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid={`delete-client-${client.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader><DialogTitle className="text-gold-500">Nouveau client</DialogTitle></DialogHeader>
          <ClientForm onSubmit={handleCreate} submitLabel="Créer le client" />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader><DialogTitle className="text-gold-500">Modifier le client</DialogTitle></DialogHeader>
          <ClientForm onSubmit={handleEdit} submitLabel="Enregistrer" />
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-red-400">Supprimer le client</DialogTitle></DialogHeader>
          <p className="text-gray-400">Êtes-vous sûr de vouloir supprimer <strong className="text-white">{selectedClient?.full_name}</strong> ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-client">
              {saving ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
