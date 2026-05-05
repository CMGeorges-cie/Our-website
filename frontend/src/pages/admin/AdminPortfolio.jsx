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
  Plus, Trash2, Edit, Camera, Loader2, ArrowUp, ArrowDown, X
} from 'lucide-react';

const emptyForm = {
  title: '',
  description: '',
  images: [],
  service_type: 'manual',
  category: 'portfolio'
};

export default function AdminPortfolio() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [newImageUrl, setNewImageUrl] = useState('');

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
    setForm(emptyForm);
    setNewImageUrl('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    // Hydrate images: prefer item.images; fallback to legacy fields
    let images = Array.isArray(item.images) && item.images.length > 0
      ? [...item.images]
      : [];
    if (images.length === 0) {
      if (item.before_image_url) images.push(item.before_image_url);
      if (item.image_url) images.push(item.image_url);
    }
    setForm({
      title: item.title || '',
      description: item.description || '',
      images,
      service_type: item.service_type || 'manual',
      category: item.category || 'portfolio'
    });
    setNewImageUrl('');
    setShowModal(true);
  };

  const addImage = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    setForm({ ...form, images: [...form.images, url] });
    setNewImageUrl('');
  };

  const removeImage = (idx) => {
    setForm({ ...form, images: form.images.filter((_, i) => i !== idx) });
  };

  const moveImage = (idx, dir) => {
    const next = [...form.images];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setForm({ ...form, images: next });
  };

  const handleSubmit = async () => {
    if (!form.title || form.images.length === 0) {
      toast.error('Titre et au moins une image sont requis');
      return;
    }
    setSubmitting(true);
    try {
      // Backwards compat: keep image_url + before_image_url derived from images list
      // - image_url: last image (or "Après" when 2+ images)
      // - before_image_url: second-to-last (or "Avant" when 2+ images)
      const last = form.images[form.images.length - 1];
      const beforeLast = form.images.length >= 2 ? form.images[form.images.length - 2] : null;
      const payload = {
        title: form.title,
        description: form.description,
        images: form.images,
        image_url: last,
        before_image_url: beforeLast,
        service_type: form.service_type,
        category: form.category
      };
      if (editItem) {
        await adminApi.updatePortfolio(editItem.id, payload);
        toast.success('Projet mis à jour');
      } else {
        await adminApi.createPortfolio(payload);
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

  // Returns the images array of a portfolio item, normalized (legacy fallback)
  const getItemImages = (item) => {
    if (Array.isArray(item.images) && item.images.length > 0) return item.images;
    const list = [];
    if (item.before_image_url) list.push(item.before_image_url);
    if (item.image_url) list.push(item.image_url);
    return list;
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
          <p className="text-muted-foreground">Gérez vos projets réalisés (carrousel multi-photos)</p>
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
          {items.map((item) => {
            const imgs = getItemImages(item);
            const cover = imgs[imgs.length - 1] || '';
            return (
              <Card key={item.id} className="bg-card border-border overflow-hidden group" data-testid={`portfolio-item-${item.id}`}>
                <div className="relative aspect-video">
                  <img
                    src={cover}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = 'https://placehold.co/600x400/1a1a2e/d4af37?text=Image'; }}
                  />
                  {imgs.length >= 2 && (
                    <span className="absolute top-2 left-2 bg-gold-500/90 text-background text-xs px-2 py-1 rounded font-medium">
                      {imgs.length} photos · Avant/Après
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
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
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

            {/* Multi-image manager */}
            <div>
              <Label>Photos du projet (carrousel) *</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Ajoutez plusieurs photos. Les <strong>2 dernières</strong> sont utilisées comme <strong>Avant</strong> (avant-dernière) et <strong>Après</strong> (dernière).
              </p>

              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
                  placeholder="URL image (https://...)"
                  className="flex-1"
                  data-testid="portfolio-new-image-input"
                />
                <Button type="button" onClick={addImage} className="bg-gold-500 hover:bg-gold-600 text-background" data-testid="portfolio-add-image-btn">
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>

              {form.images.length > 0 && (
                <div className="mt-3 space-y-2">
                  {form.images.map((url, idx) => {
                    const total = form.images.length;
                    const isAfter = total >= 2 && idx === total - 1;
                    const isBefore = total >= 2 && idx === total - 2;
                    return (
                      <div key={`${url}-${idx}`} className="flex items-center gap-2 p-2 rounded border border-border bg-background/40">
                        <img src={url} alt={`img-${idx}`} className="w-16 h-16 object-cover rounded" onError={(e) => { e.target.src = 'https://placehold.co/64x64/1a1a2e/d4af37?text=?'; }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground truncate">{url}</div>
                          <div className="flex gap-1 mt-1">
                            {isAfter && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">APRÈS</span>}
                            {isBefore && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">AVANT</span>}
                            {!isAfter && !isBefore && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Photo {idx + 1}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => moveImage(idx, -1)} disabled={idx === 0}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => moveImage(idx, 1)} disabled={idx === form.images.length - 1}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => removeImage(idx)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
