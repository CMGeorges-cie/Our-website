import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { Eye, Calendar, Clock, CheckCircle, Pause, Plus, Pencil, Trash2, Briefcase } from 'lucide-react';

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Complété' },
  { value: 'on_hold', label: 'En pause' },
];

const serviceTypes = [
  { value: 'manual', label: 'Déco Touché' },
  { value: 'furniture', label: 'Mobilier' },
  { value: 'tech', label: 'Tech' }
];

const emptyProject = {
  client_id: '',
  title: '',
  description: '',
  service_type: 'manual',
  scheduled_date: '',
  estimated_hours: ''
};

export default function AdminProjects() {
  usePageTitle('Gestion des Projets');
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState(emptyProject);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [projectsRes, clientsRes] = await Promise.all([
        adminApi.getProjects(statusFilter !== 'all' ? { status: statusFilter } : {}),
        adminApi.getClients()
      ]);
      setProjects(projectsRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleCreate = () => {
    setEditingProject(null);
    setFormData(emptyProject);
    setShowModal(true);
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      client_id: project.client_id || '',
      title: project.title || '',
      description: project.description || '',
      service_type: project.service_type || 'manual',
      scheduled_date: project.scheduled_date ? project.scheduled_date.split('T')[0] : '',
      estimated_hours: project.estimated_hours || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.client_id || !formData.title) {
      toast.error('Veuillez sélectionner un client et entrer un titre');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null
      };

      if (editingProject) {
        await adminApi.updateProject(editingProject.id, {
          scheduled_date: formData.scheduled_date || null,
          notes: formData.description
        });
        toast.success('Projet mis à jour');
      } else {
        await adminApi.createProject(payload);
        toast.success('Projet créé');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (!confirm('Supprimer ce projet? Cette action est irréversible.')) return;
    
    try {
      await adminApi.deleteProject(projectId);
      toast.success('Projet supprimé');
      fetchData();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleStatusChange = async (projectId, newStatus) => {
    try {
      await adminApi.updateProject(projectId, { status: newStatus });
      toast.success('Statut mis à jour');
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

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

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || 'Client inconnu';
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
        <Button 
          className="bg-gold-500 hover:bg-gold-600 text-black font-semibold"
          onClick={handleCreate}
          data-testid="create-project-btn"
        >
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date prévue</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
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
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
                        {getClientName(project.client_id)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {project.service_type === 'manual' ? 'Déco Touché' : 
                         project.service_type === 'furniture' ? 'Mobilier' : 'Tech'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {project.scheduled_date ? formatDateShort(project.scheduled_date) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Select value={project.status} onValueChange={(v) => handleStatusChange(project.id, v)}>
                          <SelectTrigger className={`w-32 h-8 text-xs ${getStatusClass(project.status)} bg-transparent border`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="in_progress">En cours</SelectItem>
                            <SelectItem value="completed">Complété</SelectItem>
                            <SelectItem value="on_hold">En pause</SelectItem>
                            <SelectItem value="cancelled">Annulé</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/admin/projects/${project.id}`}>
                            <Button variant="outline" size="sm" className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10 hover:border-gold-500">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
                            onClick={() => handleEdit(project)}
                            data-testid={`edit-project-${project.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                            onClick={() => handleDelete(project.id)}
                            data-testid={`delete-project-${project.id}`}
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
              {editingProject ? 'Modifier le projet' : 'Nouveau projet'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Client *</Label>
              <Select 
                value={formData.client_id} 
                onValueChange={(v) => setFormData({...formData, client_id: v})}
                disabled={!!editingProject}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-client">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Titre du projet *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Peinture appartement 4½"
                className="bg-gray-800 border-gray-700 text-white"
                disabled={!!editingProject}
                data-testid="input-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Type de service</Label>
                <Select 
                  value={formData.service_type} 
                  onValueChange={(v) => setFormData({...formData, service_type: v})}
                  disabled={!!editingProject}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-service">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {serviceTypes.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Date prévue</Label>
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-date"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Heures estimées</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                placeholder="8"
                className="bg-gray-800 border-gray-700 text-white"
                disabled={!!editingProject}
                data-testid="input-hours"
              />
            </div>

            <div>
              <Label className="text-gray-300">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description du projet..."
                rows={3}
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="input-description"
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
              data-testid="save-project-btn"
            >
              {saving ? 'Sauvegarde...' : (editingProject ? 'Mettre à jour' : 'Créer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
