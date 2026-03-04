import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { 
  Search, 
  Mail, 
  Phone, 
  Eye,
  Plus,
  Pencil,
  Trash2,
  UserCheck
} from 'lucide-react';

const emptyClient = {
  full_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postal_code: '',
  company_name: '',
  notes: ''
};

export default function AdminClients() {
  usePageTitle('Gestion des Clients');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState(emptyClient);
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    try {
      const response = await adminApi.getClients();
      setClients(response.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    client.email?.toLowerCase().includes(search.toLowerCase()) ||
    client.phone?.includes(search)
  );

  const handleCreate = () => {
    setEditingClient(null);
    setFormData(emptyClient);
    setShowModal(true);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      full_name: client.full_name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      postal_code: client.postal_code || '',
      company_name: client.company_name || '',
      notes: client.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.email || !formData.phone) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      if (editingClient) {
        await adminApi.updateClient(editingClient.id, formData);
        toast.success('Client mis à jour');
      } else {
        await adminApi.createClient(formData);
        toast.success('Client créé');
      }
      setShowModal(false);
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (clientId) => {
    if (!confirm('Supprimer ce client? Cette action est irréversible.')) return;
    
    try {
      await adminApi.deleteClient(clientId);
      toast.success('Client supprimé');
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'inactive': return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  return (
    <div data-testid="admin-clients-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Clients</h1>
          <p className="text-gray-500">Gérez votre base de clients</p>
        </div>
        <Button 
          className="bg-gold-500 hover:bg-gold-600 text-black font-semibold"
          onClick={handleCreate}
          data-testid="create-client-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau client
        </Button>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input 
              placeholder="Rechercher par nom, email, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-gold-500"
              data-testid="client-search"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="clients-table">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ville</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenus</th>
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
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      Aucun client trouvé
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr 
                      key={client.id} 
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                      data-testid={`client-row-${client.id}`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{client.full_name}</p>
                        {client.company_name && (
                          <p className="text-xs text-gray-500">{client.company_name}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gold-500" />
                            {client.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gold-500" />
                            {client.phone}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {client.city || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusClass(client.status)}`}>
                          {client.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-gold-500">
                          {formatCurrency(client.total_revenue || 0)}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {client.total_projects || 0} projet(s)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/admin/clients/${client.id}`}>
                            <Button variant="outline" size="sm" className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10 hover:border-gold-500">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
                            onClick={() => handleEdit(client)}
                            data-testid={`edit-client-${client.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                            onClick={() => handleDelete(client.id)}
                            data-testid={`delete-client-${client.id}`}
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
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editingClient ? 'Modifier le client' : 'Nouveau client'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-gray-300">Nom complet *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Jean Dupont"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-full-name"
                />
              </div>

              <div>
                <Label className="text-gray-300">Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="jean@example.com"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-email"
                />
              </div>

              <div>
                <Label className="text-gray-300">Téléphone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="514-555-1234"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-phone"
                />
              </div>

              <div>
                <Label className="text-gray-300">Entreprise</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  placeholder="ABC Inc."
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-company"
                />
              </div>

              <div>
                <Label className="text-gray-300">Ville</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="Montréal"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-city"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-gray-300">Adresse</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="123 rue Exemple"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-address"
                />
              </div>

              <div>
                <Label className="text-gray-300">Code postal</Label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                  placeholder="H2X 1Y4"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-postal"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-gray-300">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notes sur le client..."
                  rows={3}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-notes"
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
              data-testid="save-client-btn"
            >
              {saving ? 'Sauvegarde...' : (editingClient ? 'Mettre à jour' : 'Créer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
