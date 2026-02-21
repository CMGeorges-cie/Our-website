import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi } from '@/lib/api';
import { formatDateShort, getServiceLabel } from '@/lib/utils';
import { Eye, Calendar, Clock, CheckCircle, Pause, Plus } from 'lucide-react';

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Complété' },
  { value: 'on_hold', label: 'En pause' },
];

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const params = {};
        if (statusFilter && statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const response = await adminApi.getProjects(params);
        setProjects(response.data);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [statusFilter]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-400" />;
      case 'on_hold': return <Pause className="h-4 w-4 text-yellow-400" />;
      default: return <Calendar className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      pending: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
      in_progress: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      completed: 'bg-green-500/20 text-green-400 border border-green-500/30',
      on_hold: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };
    return classes[status] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'En attente',
      in_progress: 'En cours',
      completed: 'Complété',
      on_hold: 'En pause',
      cancelled: 'Annulé',
    };
    return labels[status] || status;
  };

  // Stats
  const inProgress = projects.filter(p => p.status === 'in_progress').length;
  const pending = projects.filter(p => p.status === 'pending').length;
  const completed = projects.filter(p => p.status === 'completed').length;

  return (
    <div data-testid="admin-projects">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Projets</h1>
          <p className="text-gray-500">Suivez vos projets en cours</p>
        </div>
        <Button className="bg-gold-500 hover:bg-gold-600 text-black font-semibold">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau projet
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gray-900 border-gray-800 p-6">
          <p className="text-sm text-gray-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-white">{projects.length}</p>
        </Card>
        <Card className="bg-gray-900 border-gray-800 p-6">
          <p className="text-sm text-gray-500 mb-1">En attente</p>
          <p className="text-2xl font-bold text-gray-400">{pending}</p>
        </Card>
        <Card className="bg-gray-900 border-gray-800 p-6">
          <p className="text-sm text-gray-500 mb-1">En cours</p>
          <p className="text-2xl font-bold text-blue-400">{inProgress}</p>
        </Card>
        <Card className="bg-gray-900 border-gray-800 p-6">
          <p className="text-sm text-gray-500 mb-1">Complétés</p>
          <p className="text-2xl font-bold text-green-400">{completed}</p>
        </Card>
      </div>

      {/* Filter */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px] bg-gray-800 border-gray-700 text-white" data-testid="projects-status-filter">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-gray-700">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card className="bg-gray-900 border-gray-800" data-testid="projects-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Projet</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date prévue</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      Chargement...
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      Aucun projet trouvé
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr 
                      key={project.id} 
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                      data-testid={`project-row-${project.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(project.status)}
                          <div>
                            <p className="font-medium text-white">{project.title}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">
                              {project.description || 'Pas de description'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {project.service_type === 'manual' ? 'Déco Touché' : 
                         project.service_type === 'furniture' ? 'Mobilier' : 'Tech'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {project.scheduled_date ? formatDateShort(project.scheduled_date) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(project.status)}`}>
                          {getStatusLabel(project.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/admin/projects/${project.id}`}>
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
