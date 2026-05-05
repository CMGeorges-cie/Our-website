import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Edit, Image, Eye, Camera, Loader2
} from 'lucide-react';

export default function AdminPortfolio() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    before_image_url: '',
    service_type: 'manual',
    category: 'portfolio'
  });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const { data } = await adminApi.getPortfolio();
      setItems(data);
    } catch (err) {
      toast.error('Erreur chargement portfolio');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', description: '', image_url: '', before_image_url: '', service_type: 'manual', category: 'portfolio' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      title: item.title || '',
      description: item.description || '',
      image_url: item.image_url || '',
      before_image_url: item.before_image_url || '',
      service_type: item.service_type || 'manual',
      category: item.category || 'portfolio'
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.image_url) {
      toast.error('Titre et image sont requis');
      return;
    }
    setSubmitting(true);
    try {
      if (editItem) {
        await adminApi.updatePortfolio(editItem.id, form);
        toast.success('Projet mis à jour');
      } else {
        await adminApi.createPortfolio(form);
        toast.success('Projet ajouté au portfolio');
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      toast.error('Erreur: ' + (err.response?.data?.detail || 'Erreur inconnue'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce projet du portfolio?')) return;
    try {
      await adminApi.deletePortfolio(id);
      toast.success('Projet supprimé');
      fetchItems();
    } catch (err) {
      toast.error('Erreur suppression');
    }
  };

  const serviceLabels = {
    manual: 'Peinture & Réno',
    furniture: 'Mobilier',
    entretien: 'Entretien'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-portfolio">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
          <p className="text-muted-foreground">Gérez vos projets réalisés</p>
        </div>
        <Button onClick={openCreate} className="bg-gold-500 hover:bg-gold-600 text-background" data-testid="add-portfolio-btn">
          <Plus className="h-4 w-4 mr-2" /> Ajouter un projet
        </Button>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Aucun projet</h3>
            <p className="text-muted-foreground mb-4">Ajoutez vos projets réalisés pour les afficher sur votre site</p>
            <Button onClick={openCreate} className="bg-gold-500 hover:bg-gold-600 text-background">
              <Plus className="h-4 w-4 mr-2" /> Ajouter un projet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="bg-card border-border overflow-hidden group" data-testid={`portfolio-item-${item.id}`}>
              <div className="relative aspect-video">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = 'https://placehold.co/600x400/1a1a2e/d4af37?text=Image'; }}
                />
                {item.before_image_url && (
                  <span className="absolute top-2 left-2 bg-gold-500/90 text-background text-xs px-2 py-1 rounded font-medium">
                    Avant/Après
                  </span>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(item)} className="h-8 w-8 p-0">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)} className="h-8 w-8 p-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground truncate">{item.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                <span className="inline-block mt-2 text-xs bg-gold-500/20 text-gold-500 px-2 py-0.5 rounded">
                  {serviceLabels[item.service_type] || item.service_type}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Modifier le projet' : 'Ajouter un projet'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Rénovation salon moderne"
                className="mt-1"
                data-testid="portfolio-title-input"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Décrivez le projet..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>URL Image principale *</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
                className="mt-1"
                data-testid="portfolio-image-input"
              />
              {form.image_url && (
                <img src={form.image_url} alt="Preview" className="mt-2 h-32 w-full object-cover rounded" />
              )}
            </div>
            <div>
              <Label>URL Image "Avant" (optionnel)</Label>
              <Input
                value={form.before_image_url}
                onChange={(e) => setForm({ ...form, before_image_url: e.target.value })}
                placeholder="https://... (photo avant travaux)"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Type de service</Label>
              <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Peinture & Rénovation</SelectItem>
                  <SelectItem value="furniture">Installation mobilier</SelectItem>
                  <SelectItem value="entretien">Entretien général</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-gold-500 hover:bg-gold-600 text-background"
              data-testid="portfolio-submit-btn"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editItem ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
