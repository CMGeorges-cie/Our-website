import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, EyeOff, BookOpen } from 'lucide-react';

const emptyForm = { title: '', slug: '', excerpt: '', content: '', category: 'general', tags: '', status: 'draft', featured_image: '', meta_title: '', meta_description: '' };

const statusClass = { draft: 'bg-gray-500/20 text-gray-400', published: 'bg-green-500/20 text-green-400', archived: 'bg-yellow-500/20 text-yellow-400' };
const statusLabel = { draft: 'Brouillon', published: 'Publié', archived: 'Archivé' };

function toSlug(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPosts = async () => {
    try {
      const res = await adminApi.getBlogPosts();
      setPosts(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const openCreate = () => { setForm(emptyForm); setIsEdit(false); setShowForm(true); };
  const openEdit = (post) => {
    setSelectedPost(post);
    setForm({ title: post.title || '', slug: post.slug || '', excerpt: post.excerpt || '', content: post.content || '', category: post.category || 'general', tags: (post.tags || []).join(', '), status: post.status || 'draft', featured_image: post.featured_image || '', meta_title: post.meta_title || '', meta_description: post.meta_description || '' });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) { toast.error('Titre et contenu requis'); return; }
    setSaving(true);
    try {
      const data = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), slug: form.slug || toSlug(form.title) };
      if (isEdit) {
        await adminApi.updateBlogPost(selectedPost.id, data);
        toast.success('Article mis à jour');
      } else {
        await adminApi.createBlogPost(data);
        toast.success('Article créé');
      }
      setShowForm(false);
      fetchPosts();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await adminApi.deleteBlogPost(selectedPost.id);
      toast.success('Article supprimé');
      setShowDelete(false);
      fetchPosts();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    } finally { setSaving(false); }
  };

  return (
    <div data-testid="admin-blog-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Blog</h1>
          <p className="text-gray-500">Gérez vos articles de blog</p>
        </div>
        <Button onClick={openCreate} className="bg-gold-500 hover:bg-gold-600 text-black font-semibold" data-testid="new-post-btn">
          <Plus className="h-4 w-4 mr-2" />Nouvel article
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {['draft', 'published', 'archived'].map(s => (
          <Card key={s} className="bg-gray-900 border-gray-800 p-6">
            <p className="text-sm text-gray-500 mb-1 capitalize">{statusLabel[s]}</p>
            <p className="text-2xl font-bold text-white">{posts.filter(p => p.status === s).length}</p>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Article</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Catégorie</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>Chargement...
                  </td></tr>
                ) : posts.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Aucun article. Créez votre premier article!</td></tr>
                ) : posts.map((post) => (
                  <tr key={post.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors" data-testid={`post-row-${post.id}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{post.title}</p>
                      <p className="text-xs text-gray-500">{post.excerpt?.substring(0, 60) || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 capitalize">{post.category || 'général'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass[post.status]}`}>{statusLabel[post.status]}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{formatDateShort(post.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(post)} className="border-gray-700 text-gray-400 hover:bg-gray-800" data-testid={`edit-post-${post.id}`}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedPost(post); setShowDelete(true); }} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid={`delete-post-${post.id}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-gold-500">{isEdit ? 'Modifier l\'article' : 'Nouvel article'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400">Titre *</Label>
              <Input value={form.title} onChange={e => { setForm(f => ({...f, title: e.target.value, slug: toSlug(e.target.value)})); }} className="bg-gray-800 border-gray-700 text-white mt-1" data-testid="post-title-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Slug (URL)</Label>
                <Input value={form.slug} onChange={e => setForm(f => ({...f, slug: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-gray-400">Catégorie</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {['general', 'renovation', 'mobilier', 'tech', 'conseils'].map(c => <SelectItem key={c} value={c} className="text-white hover:bg-gray-700 capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-gray-400">Extrait</Label>
              <Input value={form.excerpt} onChange={e => setForm(f => ({...f, excerpt: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="Résumé court de l'article" />
            </div>
            <div>
              <Label className="text-gray-400">Contenu * (Markdown supporté)</Label>
              <textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} className="w-full h-40 mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm resize-none focus:outline-none focus:border-gold-500" data-testid="post-content-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Tags (séparés par virgules)</Label>
                <Input value={form.tags} onChange={e => setForm(f => ({...f, tags: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1 text-sm" placeholder="renovation, montreal, conseils" />
              </div>
              <div>
                <Label className="text-gray-400">Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="draft" className="text-white hover:bg-gray-700">Brouillon</SelectItem>
                    <SelectItem value="published" className="text-white hover:bg-gray-700">Publié</SelectItem>
                    <SelectItem value="archived" className="text-white hover:bg-gray-700">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-gray-400">Image principale (URL)</Label>
              <Input value={form.featured_image} onChange={e => setForm(f => ({...f, featured_image: e.target.value}))} className="bg-gray-800 border-gray-700 text-white mt-1 text-sm" placeholder="https://..." />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="save-post-btn">
              {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Publier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-red-400">Supprimer l'article</DialogTitle></DialogHeader>
          <p className="text-gray-400">Supprimer <strong className="text-white">{selectedPost?.title}</strong> ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} className="border-gray-700 text-gray-400">Annuler</Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-post">
              {saving ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
