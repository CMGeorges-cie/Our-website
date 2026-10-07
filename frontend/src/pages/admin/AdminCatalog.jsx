import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  Paintbrush, 
  Sofa, 
  Code,
  Wrench,
  Star,
  DollarSign,
  Clock,
  Sparkles
} from 'lucide-react';
import api, { apiV2 } from '@/lib/api';

const CATEGORIES = {
  painting: { label: 'Peinture', icon: Paintbrush, color: 'bg-blue-500' },
  furniture: { label: 'Mobilier', icon: Sofa, color: 'bg-amber-500' },
  tech: { label: 'Tech', icon: Code, color: 'bg-purple-500' },
  maintenance: { label: 'Entretien', icon: Wrench, color: 'bg-green-500' },
  installation: { label: 'Installation', icon: Package, color: 'bg-orange-500' },
  renovation: { label: 'Rénovation', icon: Sparkles, color: 'bg-rose-500' },
  accent_walls: { label: "Murs d'accent", icon: Sparkles, color: 'bg-yellow-600' },
  demolition: { label: 'Démolition', icon: Package, color: 'bg-stone-500' },
  hvac: { label: 'Climatisation', icon: Wrench, color: 'bg-cyan-500' },
  other: { label: 'Autre', icon: Package, color: 'bg-gray-500' },
};

const PRICING_TYPES = {
  fixed: 'Prix fixe',
  hourly: 'À l\'heure',
  per_unit: 'Par unité',
  quote: 'Sur devis',
};

export default function AdminCatalog() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'maintenance',
    pricing_type: 'fixed',
    base_price: '',
    unit: 'forfait',
    estimated_duration: '',
    includes: '',
    excludes: '',
    is_featured: false,
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await apiV2.get('/catalog');
      setServices(response.data);
    } catch (error) {
      toast.error('Erreur de chargement du catalogue');
    } finally {
      setLoading(false);
    }
  };

  const seedDefaults = async () => {
    try {
      const response = await apiV2.post('/catalog/seed-defaults');
      toast.success(response.data.message);
      loadServices();
    } catch (error) {
      toast.error('Erreur lors de l\'initialisation');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        base_price: parseFloat(formData.base_price) || 0,
        includes: formData.includes.split('\n').filter(Boolean),
        excludes: formData.excludes.split('\n').filter(Boolean),
      };

      if (editingService) {
        await apiV2.patch(`/catalog/${editingService.id}`, payload);
        toast.success('Service mis à jour');
      } else {
        await apiV2.post('/catalog', payload);
        toast.success('Service créé');
      }
      
      setShowModal(false);
      resetForm();
      loadServices();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      category: service.category,
      pricing_type: service.pricing_type,
      base_price: service.base_price.toString(),
      unit: service.unit || 'forfait',
      estimated_duration: service.estimated_duration || '',
      includes: (service.includes || []).join('\n'),
      excludes: (service.excludes || []).join('\n'),
      is_featured: service.is_featured || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (service) => {
    if (!confirm(`Supprimer "${service.name}" ?`)) return;
    
    try {
      await apiV2.delete(`/catalog/${service.id}`);
      toast.success('Service supprimé');
      loadServices();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleFeatured = async (service) => {
    try {
      await apiV2.patch(`/catalog/${service.id}`, {
        is_featured: !service.is_featured
      });
      loadServices();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      category: 'maintenance',
      pricing_type: 'fixed',
      base_price: '',
      unit: 'forfait',
      estimated_duration: '',
      includes: '',
      excludes: '',
      is_featured: false,
    });
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (service) => {
    if (service.pricing_type === 'quote') return 'Sur devis';
    const price = service.base_price?.toFixed(0) || '0';
    if (service.pricing_type === 'hourly') return `${price}$/h`;
    if (service.pricing_type === 'per_unit') return `${price}$/${service.unit}`;
    return `${price}$`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-catalog-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catalogue de Services</h1>
          <p className="text-muted-foreground">Gérez vos services et forfaits</p>
        </div>
        <div className="flex gap-2">
          {services.length === 0 && (
            <Button variant="outline" onClick={seedDefaults}>
              <Sparkles className="w-4 h-4 mr-2" />
              Initialiser
            </Button>
          )}
          <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-gold-500 hover:bg-gold-600 text-background">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau service
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <SelectItem key={key} value={key}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredServices.map((service) => {
          const category = CATEGORIES[service.category] || CATEGORIES.other;
          const CategoryIcon = category.icon;
          
          return (
            <div
              key={service.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-gold-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${category.color}/20`}>
                  <CategoryIcon className={`w-5 h-5 ${category.color.replace('bg-', 'text-')}`} />
                </div>
                <div className="flex items-center gap-2">
                  {service.is_featured && (
                    <Star className="w-4 h-4 text-gold-500 fill-gold-500" />
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {category.label}
                  </Badge>
                </div>
              </div>

              <h3 className="font-semibold text-foreground mb-1">{service.name}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {service.description || 'Aucune description'}
              </p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {formatPrice(service)}
                </span>
                {service.estimated_duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {service.estimated_duration}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <button
                  onClick={() => toggleFeatured(service)}
                  className={`text-xs ${service.is_featured ? 'text-gold-500' : 'text-muted-foreground'} hover:text-gold-500`}
                >
                  {service.is_featured ? '★ Vedette' : '☆ Mettre en vedette'}
                </button>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(service)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(service)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Aucun service</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Aucun résultat pour cette recherche' 
              : 'Commencez par ajouter des services'}
          </p>
          {services.length === 0 && (
            <Button variant="outline" onClick={seedDefaults}>
              <Sparkles className="w-4 h-4 mr-2" />
              Charger les services par défaut
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Modifier le service' : 'Nouveau service'}</DialogTitle>
            <DialogDescription>
              {editingService ? 'Modifiez les informations du service' : 'Ajoutez un nouveau service au catalogue'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom du service *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Catégorie</label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                      <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Type de prix</label>
                <Select value={formData.pricing_type} onValueChange={(v) => setFormData({ ...formData, pricing_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRICING_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Prix de base ($) *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Unité</label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="forfait, heure, m²..."
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Durée estimée</label>
              <Input
                value={formData.estimated_duration}
                onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                placeholder="ex: 2-3 heures"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Inclus (un par ligne)</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
                value={formData.includes}
                onChange={(e) => setFormData({ ...formData, includes: e.target.value })}
                placeholder="Main d'œuvre&#10;Nettoyage&#10;..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Exclus (un par ligne)</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2}
                value={formData.excludes}
                onChange={(e) => setFormData({ ...formData, excludes: e.target.value })}
                placeholder="Matériaux&#10;Livraison&#10;..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_featured}
                onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })}
              />
              <label className="text-sm">Service en vedette</label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-gold-500 hover:bg-gold-600 text-background">
                {editingService ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
