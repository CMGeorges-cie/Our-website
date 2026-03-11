import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { formatDateShort, getServiceLabel } from '@/lib/utils';
import { toast } from 'sonner';
import { Eye, Calendar, Clock, CheckCircle, Pause, Plus, Trash2 } from 'lucide-react';

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Complété' },
  { value: 'on_hold', label: 'En pause' },
];

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed': return <CheckCircle className="h-4 w-4 text-green-400" />;
    case 'in_progress': return <Clock className="h-4 w-4 text-blue-400" />;
    case 'on_hold': return <Pause className="h-4 w-4 text-yellow-400" />;
    default: return <Calendar className="h-4 w-4 text-gray-400" />;
  }
};
const getStatusClass = (status) => {
  const c = { pending: 'bg-gray-500/20 text-gray-400 border border-gray-500/30', in_progress: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', completed: 'bg-green-500/20 text-green-400 border border-green-500/30', on_hold: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30' };
  return c[status] || 'bg-gray-500/20 text-gray-400';
};
const getStatusLabel = (status) => {
  const l = { pending: 'En attente', in_progress: 'En cours', completed: 'Complété', on_hold: 'En pause', cancelled: 'Annulé' };
  return l[status] || status;
};

const emptyForm = { client_id: '', title: '', description: '', service_type: 'manual', scheduled_date: '', estimated_hours: '' };

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const response = await adminApi.getProjects(params);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { adminApi.getClients().then(r => setClients(r.data || [])).catch(() => {}); }, []);

  const handleCreate = async () => {
    if (!form.client_id || !form.title) { toast.error('Client et titre requis'); return; }
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.scheduled_date) delete data.scheduled_date;
      if (!data.estimated_hours) delete data.estimated_hours;
      else data.estimated_hours = parseFloat(data.estimated_hours);
      await adminApi.createProject(data);
      toast.success('Projet créé');
      setShowCreate(false);
      setForm(emptyForm);
      fetchProjects();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await adminApi.deleteProject(selectedProject.id);
      toast.success('Projet supprimé');
      setShowDelete(false);
      fetchProjects();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    } finally { setSaving(false); }
  };

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
        <Button onClick={() => setShowCreate(true)} className="bg-gold-500 hover:bg-gold-600 text-black font-semibold" data-testid="new-project-btn">
          <Plus className="h-4 w-4 mr-2" />Nouveau projet
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gray-900 border-gray-800 p-6"><p className="text-sm text-gray-500 mb-1">Total</p><p className="text-2xl font-bold text-white">{projects.length}</p></Card>
        <Card className="bg-gray-900 border-gray-800 p-6"><p className="text-sm text-gray-500 mb-1">En attente</p><p className="text-2xl font-bold text-gray-400">{pending}</p></Card>
        <Card className="bg-gray-900 border-gray-800 p-6"><p className="text-sm text-gray-500 mb-1">En cours</p><p className="text-2xl font-bold text-blue-400">{inProgress}</p></Card>
        <Card className="bg-gray-900 border-gray-800 p-6"><p className="text-sm text-gray-500 mb-1">Complétés</p><p className="text-2xl font-bold text-green-400">{completed}</p></Card>
      </div>

      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px] bg-gray-800 border-gray-700 text-white" data-testid="projects-status-filter"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-gray-700">{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

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
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>Chargement...
                  </td></tr>
                ) : projects.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Aucun projet trouvé</td></tr>
                ) : projects.map((project) => (
                  <tr key={project.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors" data-testid={`project-row-${project.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(project.status)}
                        <div>
                          <p className="font-medium text-white">{project.title}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{project.description || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {project.service_type === 'manual' ? 'Déco Touché' : project.service_type === 'furniture' ? 'Mobilier' : 'Tech'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{project.scheduled_date ? formatDateShort(project.scheduled_date) : '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(project.status)}`}>{getStatusLabel(project.status)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/projects/${project.id}`}>
                          <Button variant="outline" size="sm" className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10" data-testid={`view-project-${project.id}`}><Eye className="h-4 w-4 mr-1" />Voir</Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedProject(project); setShowDelete(true); }} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid={`delete-project-${project.id}`}><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle className="text-gold-500">Nouveau projet</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400">Client *</Label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({...f, client_id: v}))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1" data-testid="project-client-select"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {clients.map(c => <SelectItem key={c.id} value={c.id} className="text-white hover:bg-gray-700">{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-400">Titre *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" data-testid="project-title-input" />
            </div>
            <div>
              <Label className="text-gray-400">Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Type de service</Label>
                <Select value={form.service_type} onValueChange={v => setForm(f => ({...f, service_type: v}))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="manual" className="text-white hover:bg-gray-700">Déco Touché</SelectItem>
                    <SelectItem value="furniture" className="text-white hover:bg-gray-700">Mobilier</SelectItem>
                    <SelectItem value="tech" className="text-white hover:bg-gray-700">Tech</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-400">Heures estimées</Label>
                <Input type="number" value={form.estimated_hours} onChange={e => setForm(f => ({...f, estimated_hours: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="ex: 8" />
              </div>
            </div>
            <div>
              <Label className="text-gray-400">Date prévue</Label>
              <Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({...f, scheduled_date: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" data-testid="project-date-input" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="create-project-submit">
              {saving ? 'Création...' : 'Créer le projet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-red-400">Supprimer le projet</DialogTitle></DialogHeader>
          <p className="text-gray-400">Supprimer <strong className="text-white">{selectedProject?.title}</strong> ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-project">
              {saving ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
