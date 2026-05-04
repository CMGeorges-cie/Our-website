import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ExternalLink, Loader2, Video, Image as ImageIcon } from 'lucide-react';

const platformConfig = {
  instagram: { label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: '📸' },
  tiktok: { label: 'TikTok', color: 'bg-black', icon: '🎵' },
  facebook: { label: 'Facebook', color: 'bg-blue-600', icon: '👍' },
  youtube: { label: 'YouTube', color: 'bg-red-600', icon: '▶️' },
};

export default function AdminSocial() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', platform: 'instagram', post_url: '', thumbnail_url: '', video_url: ''
  });

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      const { data } = await adminApi.getSocialPosts();
      setPosts(data);
    } catch (err) {
      toast.error('Erreur chargement posts sociaux');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditPost(null);
    setForm({ title: '', description: '', platform: 'instagram', post_url: '', thumbnail_url: '', video_url: '' });
    setShowModal(true);
  };

  const openEdit = (post) => {
    setEditPost(post);
    setForm({
      title: post.title || '',
      description: post.description || '',
      platform: post.platform || 'instagram',
      post_url: post.post_url || '',
      thumbnail_url: post.thumbnail_url || '',
      video_url: post.video_url || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.post_url || !form.thumbnail_url) {
      toast.error('Titre, lien du post et image sont requis');
      return;
    }
    setSubmitting(true);
    try {
      if (editPost) {
        await adminApi.updateSocialPost(editPost.id, form);
        toast.success('Post mis à jour');
      } else {
        await adminApi.createSocialPost(form);
        toast.success('Post ajouté');
      }
      setShowModal(false);
      fetchPosts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce post?')) return;
    try {
      await adminApi.deleteSocialPost(id);
      toast.success('Post supprimé');
      fetchPosts();
    } catch (err) {
      toast.error('Erreur suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-social">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Réseaux Sociaux</h1>
          <p className="text-muted-foreground">Gérez les posts affichés sur votre site (liens vers Instagram, TikTok, etc.)</p>
        </div>
        <Button onClick={openCreate} className="bg-gold-500 hover:bg-gold-600 text-background" data-testid="add-social-btn">
          <Plus className="h-4 w-4 mr-2" /> Ajouter un post
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Aucun post</h3>
            <p className="text-muted-foreground mb-4">
              Ajoutez vos posts Instagram/TikTok pour les afficher sur votre site.
              Les visiteurs pourront cliquer pour voir la vidéo/post sur le réseau social.
            </p>
            <Button onClick={openCreate} className="bg-gold-500 hover:bg-gold-600 text-background">
              <Plus className="h-4 w-4 mr-2" /> Ajouter un post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => {
            const config = platformConfig[post.platform] || platformConfig.instagram;
            return (
              <Card key={post.id} className="bg-card border-border overflow-hidden group" data-testid={`social-post-${post.id}`}>
                <div className="relative aspect-square">
                  <img
                    src={post.thumbnail_url}
                    alt={post.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = 'https://placehold.co/400x400/1a1a2e/d4af37?text=Post'; }}
                  />
                  <span className={`absolute top-2 left-2 ${config.color} text-white text-xs px-2 py-1 rounded font-medium`}>
                    {config.icon} {config.label}
                  </span>
                  {post.video_url && (
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Video className="h-3 w-3" /> Vidéo
                    </span>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(post)} className="h-8 w-8 p-0">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(post.id)} className="h-8 w-8 p-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <a
                    href={post.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors group/link"
                  >
                    <ExternalLink className="h-8 w-8 text-white opacity-0 group-hover/link:opacity-100 transition-opacity" />
                  </a>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground truncate">{post.title}</h3>
                  {post.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.description}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>{editPost ? 'Modifier le post' : 'Ajouter un post réseaux sociaux'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plateforme *</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">📸 Instagram</SelectItem>
                  <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                  <SelectItem value="facebook">👍 Facebook</SelectItem>
                  <SelectItem value="youtube">▶️ YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Titre *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Transformation salon client"
                className="mt-1"
                data-testid="social-title-input"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Courte description..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Lien du post (URL complète) *</Label>
              <Input
                value={form.post_url}
                onChange={(e) => setForm({ ...form, post_url: e.target.value })}
                placeholder="https://www.instagram.com/p/... ou https://www.tiktok.com/@.../video/..."
                className="mt-1"
                data-testid="social-url-input"
              />
            </div>
            <div>
              <Label>Image/Miniature *</Label>
              <Input
                value={form.thumbnail_url}
                onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                placeholder="https://... (capture d'écran ou photo du post)"
                className="mt-1"
                data-testid="social-thumbnail-input"
              />
              {form.thumbnail_url && (
                <img src={form.thumbnail_url} alt="Preview" className="mt-2 h-32 w-full object-cover rounded" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-gold-500 hover:bg-gold-600 text-background"
              data-testid="social-submit-btn"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editPost ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
