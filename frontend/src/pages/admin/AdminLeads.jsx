import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi } from '@/lib/api';
import { 
  formatDateShort, 
  getStatusLabel, 
  getServiceLabel, 
  getUrgencyLabel 
} from '@/lib/utils';
import { 
  Search, 
  Filter,
  Eye,
  Phone,
  Mail
} from 'lucide-react';

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'new', label: 'Nouveaux' },
  { value: 'contacted', label: 'Contactés' },
  { value: 'quoted', label: 'Soumis' },
  { value: 'won', label: 'Gagnés' },
  { value: 'lost', label: 'Perdus' },
];

const serviceOptions = [
  { value: 'all', label: 'Tous les services' },
  { value: 'manual', label: 'Déco Touché' },
  { value: 'furniture', label: 'Mobilier' },
  { value: 'tech', label: 'Tech' },
];

export default function AdminLeads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [serviceFilter, setServiceFilter] = useState('all');

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const params = {};
        if (statusFilter && statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (serviceFilter && serviceFilter !== 'all') {
          params.service_type = serviceFilter;
        }
        
        const response = await adminApi.getLeads(params);
        setLeads(response.data);
      } catch (error) {
        console.error('Error fetching leads:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [statusFilter, serviceFilter]);

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lead.full_name.toLowerCase().includes(search) ||
      lead.email.toLowerCase().includes(search) ||
      lead.phone.includes(search) ||
      lead.city?.toLowerCase().includes(search)
    );
  });

  const getStatusClass = (status) => {
    const classes = {
      new: 'status-new',
      contacted: 'status-contacted',
      quoted: 'status-quoted',
      won: 'status-won',
      lost: 'status-lost',
    };
    return classes[status] || '';
  };

  return (
    <div data-testid="admin-leads">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1a365d] font-['Outfit']">Leads</h1>
          <p className="text-gray-500">Gérez vos demandes de soumission</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6" data-testid="leads-filters">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, email, téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="leads-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]" data-testid="leads-status-filter">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-full md:w-[180px]" data-testid="leads-service-filter">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                {serviceOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card data-testid="leads-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Urgence</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      Chargement...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      Aucun lead trouvé
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      data-testid={`lead-row-${lead.id}`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-[#1a365d]">{lead.full_name}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">{getServiceLabel(lead.service_type)}</span>
                        {lead.items?.length > 0 && (
                          <span className="block text-xs text-gray-500">
                            {lead.items.length} meuble(s)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`status-badge ${getStatusClass(lead.status)}`}>
                          {getStatusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm ${lead.urgency_level === 'urgent' ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {getUrgencyLabel(lead.urgency_level)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {formatDateShort(lead.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/admin/leads/${lead.id}`}>
                          <Button variant="outline" size="sm" data-testid={`view-lead-${lead.id}`}>
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
