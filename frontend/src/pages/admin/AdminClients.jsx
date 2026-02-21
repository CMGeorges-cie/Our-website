import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { 
  Search, 
  Users, 
  Mail, 
  Phone, 
  Eye,
  Plus,
  Download,
  Printer
} from 'lucide-react';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
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
    fetchClients();
  }, []);

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    client.email?.toLowerCase().includes(search.toLowerCase()) ||
    client.phone?.includes(search)
  );

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
        <Button className="bg-gold-500 hover:bg-gold-600 text-black font-semibold">
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
                        <Link to={`/admin/clients/${client.id}`}>
                          <Button variant="outline" size="sm" className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10 hover:border-gold-500">
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
