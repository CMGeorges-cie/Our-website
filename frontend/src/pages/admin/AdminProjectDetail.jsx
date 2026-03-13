import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { adminApi } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowLeft, Download, Printer, User, Calendar, Briefcase, MapPin,
  CheckCircle, Clock, AlertCircle, Plus, Trash2, Edit2, Save, X,
  FileText, MessageSquare, Camera, History, Send
} from 'lucide-react';

const statusOptions = [
  { value: 'pending', label: 'En attente', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { value: 'in_progress', label: 'En cours', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'on_hold', label: 'En pause', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'completed', label: 'Terminé', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
];

const getStatusIcon = (status) => {
  switch(status) {
    case 'completed': return <CheckCircle className="h-5 w-5 text-green-400" />;
    case 'in_progress': return <Clock className="h-5 w-5 text-blue-400" />;
    case 'on_hold': return <AlertCircle className="h-5 w-5 text-yellow-400" />;
    default: return <Clock className="h-5 w-5 text-gray-400" />;
  }
};

const getStatusConfig = (status) => statusOptions.find(s => s.value === status) || statusOptions[0];

const timelineIcons = {
  task_added: Plus,
  task_completed: CheckCircle,
  status_change: Clock,
  note_added: MessageSquare,
  photo_added: Camera,
  report_generated: FileText,
  message_sent: Send,
};

export default function AdminProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  
  // Task modal
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '' });
  
  // Note modal
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  
  // Messaging
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchData = async () => {
    try {
      const projectRes = await adminApi.getProject(id);
      setProject(projectRes.data);
      setEditForm({
        title: projectRes.data.title || '',
        description: projectRes.data.description || '',
        notes: projectRes.data.notes || '',
        scheduled_date: projectRes.data.scheduled_date?.split('T')[0] || '',
        status: projectRes.data.status || 'pending',
      });
      
      if (projectRes.data.client_id) {
        const clientRes = await adminApi.getClient(projectRes.data.client_id);
        setClient(clientRes.data);
      }
      
      // Fetch messages
      try {
        const messagesRes = await adminApi.getProjectMessages(id);
        setMessages(messagesRes.data);
        // Mark messages as read
        await adminApi.markProjectMessagesRead(id);
      } catch (e) {
        // Messages might not exist yet
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await adminApi.updateProject(id, editForm);
      toast.success('Projet mis à jour');
      setIsEditing(false);
      fetchData();
    } catch (e) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    setSaving(true);
    try {
      await adminApi.createProjectTask(id, newTask);
      toast.success('Tâche ajoutée');
      setShowAddTask(false);
      setNewTask({ title: '', description: '', due_date: '' });
      fetchData();
    } catch (e) {
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await adminApi.updateProjectTask(id, taskId, newStatus);
      fetchData();
    } catch (e) {
      toast.error('Erreur');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await adminApi.deleteProjectTask(id, taskId);
      fetchData();
    } catch (e) {
      toast.error('Erreur');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      await adminApi.addProjectTimeline(id, 'note_added', newNote);
      toast.success('Note ajoutée');
      setShowAddNote(false);
      setNewNote('');
      fetchData();
    } catch (e) {
      toast.error('Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    try {
      await adminApi.sendProjectMessage(id, newMessage);
      setNewMessage('');
      // Refresh messages
      const messagesRes = await adminApi.getProjectMessages(id);
      setMessages(messagesRes.data);
      fetchData(); // Refresh timeline too
    } catch (e) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await adminApi.getProjectReport(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${id.substring(0, 8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Rapport téléchargé');
      fetchData();
    } catch (e) {
      toast.error('Erreur lors du téléchargement');
    }
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
          <ArrowLeft className="mr-2 h-4 w-4" />Retour aux projets
        </Button>
      </div>
    );
  }

  const tasks = project.tasks || [];
  const timeline = project.timeline || [];
  const progress = project.progress || 0;
  const statusConfig = getStatusConfig(project.status);

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
            {isEditing ? (
              <Input 
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white text-xl font-bold"
              />
            ) : (
              <h1 className="text-2xl font-bold text-white">{project.title}</h1>
            )}
            <span className={`inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
              {getStatusIcon(project.status)}
              {statusConfig.label}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadReport} className="border-gray-700 hover:bg-gray-800 text-white" data-testid="download-report-btn">
            <Printer className="h-4 w-4 mr-2" />Rapport
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} className="border-gray-700 text-gray-400">
                <X className="h-4 w-4 mr-1" />Annuler
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="save-project-btn">
                <Save className="h-4 w-4 mr-1" />{saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="edit-project-btn">
              <Edit2 className="h-4 w-4 mr-1" />Modifier
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Progression du projet</h3>
            <span className="text-2xl font-bold text-gold-500">{progress}%</span>
          </div>
          <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Démarrage</span>
            <span>{tasks.filter(t => t.status === 'completed').length}/{tasks.length} tâches</span>
            <span>Terminé</span>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-gold-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Client</p>
                <p className="text-white font-medium truncate">{client?.full_name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Service</p>
                <p className="text-white font-medium">
                  {project.service_type === 'manual' ? 'Déco Touché' : 
                   project.service_type === 'furniture' ? 'Mobilier' : 'Tech'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Date prévue</p>
                {isEditing ? (
                  <Input 
                    type="date" 
                    value={editForm.scheduled_date}
                    onChange={e => setEditForm(f => ({ ...f, scheduled_date: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm h-8 w-32"
                  />
                ) : (
                  <p className="text-white font-medium">
                    {project.scheduled_date ? formatDateShort(project.scheduled_date) : 'Non définie'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-gold-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Adresse</p>
                <p className="text-white font-medium truncate">{client?.address || client?.city || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Edit (when editing) */}
      {isEditing && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <Label className="text-gray-400 mb-2 block">Statut du projet</Label>
            <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-gray-700">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-lg">Tâches ({tasks.length})</CardTitle>
            <Button size="sm" onClick={() => setShowAddTask(true)} className="bg-gold-500/20 text-gold-500 hover:bg-gold-500/30" data-testid="add-task-btn">
              <Plus className="h-4 w-4 mr-1" />Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Aucune tâche. Cliquez sur "Ajouter" pour en créer une.</p>
            ) : (
              tasks.map(task => (
                <div 
                  key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    task.status === 'completed' 
                      ? 'bg-green-500/5 border-green-500/20' 
                      : 'bg-gray-800/50 border-gray-700 hover:border-gold-500/30'
                  }`}
                  data-testid={`task-${task.id}`}
                >
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => handleToggleTask(task.id, task.status)}
                    className="border-gray-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-white'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-500 truncate">{task.description}</p>
                    )}
                  </div>
                  {task.due_date && (
                    <span className="text-xs text-gray-500">{formatDateShort(task.due_date)}</span>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-gold-500" />
              Historique
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddNote(true)} className="bg-gold-500/20 text-gold-500 hover:bg-gold-500/30">
              <MessageSquare className="h-4 w-4 mr-1" />Note
            </Button>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {timeline.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Aucun événement dans l'historique.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-700"></div>
                <div className="space-y-4">
                  {[...timeline].reverse().slice(0, 20).map(event => {
                    const Icon = timelineIcons[event.event_type] || History;
                    return (
                      <div key={event.id} className="flex gap-4 relative">
                        <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center z-10">
                          <Icon className="h-4 w-4 text-gold-500" />
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-white text-sm">{event.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{formatDateShort(event.created_at)}</span>
                            {event.created_by && (
                              <span className="text-xs text-gray-600">par {event.created_by}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Messaging Section */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gold-500" />
            Messages avec le client
          </CardTitle>
          {messages.filter(m => m.sender_type === 'client' && !m.is_read).length > 0 && (
            <span className="px-2 py-1 bg-gold-500/20 text-gold-500 text-xs rounded-full">
              {messages.filter(m => m.sender_type === 'client' && !m.is_read).length} nouveau(x)
            </span>
          )}
        </CardHeader>
        <CardContent>
          {!client ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Aucun client associé à ce projet. Associez un client pour activer la messagerie.
            </p>
          ) : (
            <>
              {/* Messages List */}
              <div className="h-[300px] overflow-y-auto mb-4 space-y-3 p-3 bg-gray-800/30 rounded-lg" data-testid="messages-container">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    Aucun message. Envoyez le premier message au client.
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender_type === 'admin'
                            ? 'bg-gold-500/20 text-white border border-gold-500/30'
                            : 'bg-gray-700 text-white'
                        }`}
                      >
                        <p className="text-xs text-gray-400 mb-1">
                          {msg.sender_name} • {formatDateShort(msg.created_at)}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Send Message Form */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrire un message..."
                  className="bg-gray-800 border-gray-700 text-white flex-1"
                  data-testid="message-input"
                />
                <Button
                  type="submit"
                  disabled={sendingMessage || !newMessage.trim()}
                  className="bg-gold-500 hover:bg-gold-600 text-black"
                  data-testid="send-message-btn"
                >
                  {sendingMessage ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      {/* Description & Notes */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Description</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea 
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
              placeholder="Description du projet..."
            />
          ) : (
            <p className="text-gray-300">{project.description || 'Aucune description'}</p>
          )}
          
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Notes internes</h4>
            {isEditing ? (
              <Textarea 
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                placeholder="Notes..."
              />
            ) : (
              <p className="text-gray-300">{project.notes || 'Aucune note'}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Task Modal */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gold-500">Nouvelle tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400">Titre *</Label>
              <Input 
                value={newTask.title}
                onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="Ex: Préparer le matériel"
                data-testid="task-title-input"
              />
            </div>
            <div>
              <Label className="text-gray-400">Description</Label>
              <Textarea 
                value={newTask.description}
                onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="Détails de la tâche..."
              />
            </div>
            <div>
              <Label className="text-gray-400">Date d'échéance</Label>
              <Input 
                type="date"
                value={newTask.due_date}
                onChange={e => setNewTask(t => ({ ...t, due_date: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAddTask(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleAddTask} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="submit-task-btn">
              {saving ? 'Ajout...' : 'Ajouter la tâche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gold-500">Ajouter une note</DialogTitle>
          </DialogHeader>
          <div>
            <Textarea 
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
              placeholder="Écrivez votre note..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNote(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleAddNote} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black">
              {saving ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
