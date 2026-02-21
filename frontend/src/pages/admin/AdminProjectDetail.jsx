import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/api';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  User, 
  Calendar,
  Briefcase,
  MapPin,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function AdminProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectRes = await adminApi.getProject(id);
        setProject(projectRes.data);
        
        if (projectRes.data.client_id) {
          const clientRes = await adminApi.getClient(projectRes.data.client_id);
          setClient(clientRes.data);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-400" />;
      case 'on_hold': return <AlertCircle className="h-5 w-5 text-yellow-400" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'on_hold': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'En attente',
      in_progress: 'En cours',
      completed: 'Terminé',
      on_hold: 'En pause',
      cancelled: 'Annulé'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Projet non trouvé</p>
        <Button onClick={() => navigate('/admin/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux projets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="project-detail-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/admin/projects">
            <Button variant="outline" size="sm" className="border-gray-700 hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{project.title}</h1>
            <span className={`inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusClass(project.status)}`}>
              {getStatusIcon(project.status)}
              {getStatusLabel(project.status)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-gray-700 hover:bg-gray-800 text-white">
            <Printer className="h-4 w-4 mr-2" />
            Rapport
          </Button>
          <Button className="bg-gold-500 hover:bg-gold-600 text-black">
            Modifier
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Client</p>
                <p className="text-white font-medium">{client?.full_name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Service</p>
                <p className="text-white font-medium capitalize">
                  {project.service_type === 'manual' ? 'Déco Touché' : 
                   project.service_type === 'furniture' ? 'Mobilier' : 'Tech'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Date prévue</p>
                <p className="text-white font-medium">
                  {project.scheduled_date ? formatDateShort(project.scheduled_date) : 'Non définie'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Adresse</p>
                <p className="text-white font-medium">{project.address || client?.city || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Description du projet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300">{project.description || 'Aucune description'}</p>
          
          {project.notes && (
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Notes internes</h4>
              <p className="text-gray-300">{project.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline/Progress */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all"
                style={{ 
                  width: project.status === 'completed' ? '100%' : 
                         project.status === 'in_progress' ? '50%' : 
                         project.status === 'pending' ? '0%' : '25%'
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Démarrage</span>
              <span>En cours</span>
              <span>Terminé</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500">Date de création</p>
              <p className="text-white">{formatDateShort(project.created_at)}</p>
            </div>
            {project.start_date && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500">Date de début</p>
                <p className="text-white">{formatDateShort(project.start_date)}</p>
              </div>
            )}
            {project.end_date && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500">Date de fin</p>
                <p className="text-white">{formatDateShort(project.end_date)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
