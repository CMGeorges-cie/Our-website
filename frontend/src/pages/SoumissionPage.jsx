import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Trash2, 
  Send,
  Paintbrush,
  Sofa,
  Camera,
  Upload,
  X,
  Loader2
} from 'lucide-react';
import { publicApi } from '@/lib/api';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

const serviceTypes = [
  { value: 'manual', label: 'Peinture & Rénovation', icon: Paintbrush },
  { value: 'furniture', label: 'Installation de mobilier', icon: Sofa },
];

const itemTypes = [
  { value: 'bed', label: 'Lit' },
  { value: 'dresser', label: 'Commode' },
  { value: 'desk', label: 'Bureau' },
  { value: 'wardrobe', label: 'Garde-robe' },
  { value: 'sofa', label: 'Sofa' },
  { value: 'table', label: 'Table' },
  { value: 'chair', label: 'Chaise' },
  { value: 'shelf', label: 'Étagère' },
  { value: 'other', label: 'Autre' },
];

const brands = [
  { value: 'ikea', label: 'IKEA' },
  { value: 'jysk', label: 'JYSK' },
  { value: 'structube', label: 'Structube' },
  { value: 'wayfair', label: 'Wayfair' },
  { value: 'other', label: 'Autre' },
];

const sources = [
  { value: 'google', label: 'Google' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referral', label: 'Référence' },
  { value: 'other', label: 'Autre' },
];

const emptyItem = {
  item_type: 'bed',
  brand: 'ikea',
  model: '',
  quantity: 1,
  wall_anchor_required: false,
};

export default function SoumissionPage() {
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState([]);  // [{file, preview, url}]
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    service_type: '',
    address: '',
    city: '',
    preferred_date: '',
    urgency_level: 'normal',
    description: '',
    source: 'other',
    items: [],
  });

  const isFurniture = formData.service_type === 'furniture';

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }]
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos autorisées');
      return;
    }
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      url: null,
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadPhotos = async () => {
    const toUpload = photos.filter(p => !p.url);
    if (toUpload.length === 0) return photos.filter(p => p.url).map(p => p.url);
    
    setUploading(true);
    try {
      const formData = new FormData();
      toUpload.forEach(p => formData.append('files', p.file));
      const res = await axios.post(`${BACKEND_URL}/api/v1/upload/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const urls = res.data.urls;
      // Update photo objects with server URLs
      let urlIndex = 0;
      setPhotos(prev => prev.map(p => {
        if (!p.url && urlIndex < urls.length) {
          return { ...p, url: urls[urlIndex++] };
        }
        return p;
      }));
      return [...photos.filter(p => p.url).map(p => p.url), ...urls];
    } catch (err) {
      toast.error('Erreur upload photos: ' + (err.response?.data?.detail || 'Réessayez'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!recaptchaToken && RECAPTCHA_SITE_KEY) {
      toast.error('Veuillez compléter le reCAPTCHA');
      return;
    }
    
    setLoading(true);

    try {
      // Upload photos first
      let photoUrls = [];
      if (photos.length > 0) {
        const urls = await uploadPhotos();
        if (urls === null) { setLoading(false); return; }
        photoUrls = urls;
      }
      
      const data = { 
        ...formData,
        photos: photoUrls,
        recaptcha_token: recaptchaToken
      };
      if (!isFurniture) {
        data.items = [];
      }
      
      await publicApi.createLead(data);
      toast.success('Demande envoyée avec succès!', {
        description: 'Nous vous contacterons dans les plus brefs délais.'
      });
      navigate('/');
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast.error('Erreur lors de l\'envoi', {
        description: error.response?.data?.detail || 'Veuillez réessayer.'
      });
      // Reset reCAPTCHA on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-add first item when furniture is selected
  useEffect(() => {
    if (isFurniture && formData.items.length === 0) {
      addItem();
    }
  }, [isFurniture]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="soumission-page">
      {/* Header */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            Demande de soumission
          </h1>
          <p className="text-white/80 max-w-2xl">
            Remplissez le formulaire ci-dessous et recevez une soumission détaillée gratuite 
            dans les 24 heures.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="section-spacing">
        <div className="container-main max-w-3xl">
          <Card className="shadow-xl" data-testid="soumission-form-card">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1a365d] font-['Outfit']">
                Vos informations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Service Type */}
                <div className="form-group">
                  <Label className="form-label">Type de service *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    {serviceTypes.map((service) => {
                      const Icon = service.icon;
                      const isSelected = formData.service_type === service.value;
                      return (
                        <button
                          key={service.value}
                          type="button"
                          onClick={() => handleChange('service_type', service.value)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            isSelected 
                              ? 'border-[#d4af37] bg-[#d4af37]/10' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          data-testid={`service-type-${service.value}`}
                        >
                          <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-[#d4af37]' : 'text-gray-400'}`} />
                          <span className={`text-sm font-medium ${isSelected ? 'text-[#1a365d]' : 'text-gray-700'}`}>
                            {service.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <Label htmlFor="full_name" className="form-label">Nom complet *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleChange('full_name', e.target.value)}
                      required
                      data-testid="input-full-name"
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="phone" className="form-label">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="514-555-1234"
                      required
                      data-testid="input-phone"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <Label htmlFor="email" className="form-label">Courriel *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>

                {/* Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <Label htmlFor="address" className="form-label">Adresse</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      data-testid="input-address"
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="city" className="form-label">Ville</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Montréal"
                      data-testid="input-city"
                    />
                  </div>
                </div>

                {/* Date & Urgency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <Label htmlFor="preferred_date" className="form-label">Date souhaitée</Label>
                    <Input
                      id="preferred_date"
                      type="date"
                      value={formData.preferred_date}
                      onChange={(e) => handleChange('preferred_date', e.target.value)}
                      data-testid="input-preferred-date"
                    />
                  </div>
                  <div className="form-group">
                    <Label className="form-label">Urgence</Label>
                    <Select 
                      value={formData.urgency_level} 
                      onValueChange={(v) => handleChange('urgency_level', v)}
                    >
                      <SelectTrigger data-testid="select-urgency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgent (+20%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Furniture Items */}
                {isFurniture && (
                  <div className="space-y-4 p-6 bg-[#E07A5F]/10 rounded-lg" data-testid="furniture-items-section">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-[#1a365d]">Meubles à assembler</h3>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={addItem}
                        data-testid="add-item-btn"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter
                      </Button>
                    </div>

                    {formData.items.map((item, index) => (
                      <Card key={index} className="p-4" data-testid={`furniture-item-${index}`}>
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-sm font-medium text-gray-500">Meuble #{index + 1}</span>
                          {formData.items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-500 hover:text-red-700"
                              data-testid={`remove-item-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs">Type</Label>
                            <Select 
                              value={item.item_type}
                              onValueChange={(v) => updateItem(index, 'item_type', v)}
                            >
                              <SelectTrigger data-testid={`item-type-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {itemTypes.map(t => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Marque</Label>
                            <Select 
                              value={item.brand}
                              onValueChange={(v) => updateItem(index, 'brand', v)}
                            >
                              <SelectTrigger data-testid={`item-brand-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {brands.map(b => (
                                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Modèle</Label>
                            <Input
                              value={item.model}
                              onChange={(e) => updateItem(index, 'model', e.target.value)}
                              placeholder="ex: MALM"
                              data-testid={`item-model-${index}`}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Quantité</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              data-testid={`item-quantity-${index}`}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex items-center space-x-2">
                          <Checkbox
                            id={`anchor-${index}`}
                            checked={item.wall_anchor_required}
                            onCheckedChange={(checked) => updateItem(index, 'wall_anchor_required', checked)}
                            data-testid={`item-anchor-${index}`}
                          />
                          <Label htmlFor={`anchor-${index}`} className="text-sm text-gray-600">
                            Ancrage mural requis (sécurité enfants)
                          </Label>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Description */}
                <div className="form-group">
                  <Label htmlFor="description" className="form-label">Description du projet</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={4}
                    placeholder="Décrivez votre projet en détail..."
                    data-testid="input-description"
                  />
                </div>

                {/* Photo Upload */}
                <div className="form-group">
                  <Label className="form-label">Photos du projet (optionnel)</Label>
                  <p className="text-xs text-gray-500 mb-3">Ajoutez jusqu'à 5 photos pour nous aider à mieux évaluer votre projet</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group">
                        <img src={photo.preview} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {photo.url && (
                          <span className="absolute bottom-1 left-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded">OK</span>
                        )}
                      </div>
                    ))}
                    
                    {photos.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-[#d4af37] flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
                        data-testid="photo-upload-btn"
                      >
                        <Camera className="h-6 w-6 text-gray-400" />
                        <span className="text-xs text-gray-400">Ajouter</span>
                      </button>
                    )}
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                    data-testid="photo-file-input"
                  />
                  
                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-[#d4af37]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Upload en cours...
                    </div>
                  )}
                </div>

                {/* Source */}
                <div className="form-group">
                  <Label className="form-label">Comment nous avez-vous connu?</Label>
                  <Select 
                    value={formData.source} 
                    onValueChange={(v) => handleChange('source', v)}
                  >
                    <SelectTrigger data-testid="select-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* reCAPTCHA */}
                {RECAPTCHA_SITE_KEY && (
                  <div className="flex justify-center" data-testid="recaptcha-container">
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={RECAPTCHA_SITE_KEY}
                      onChange={handleRecaptchaChange}
                    />
                  </div>
                )}

                {/* Submit */}
                <Button 
                  type="submit" 
                  className="btn-accent w-full"
                  size="lg"
                  disabled={loading || !formData.service_type || !formData.full_name || !formData.email || !formData.phone || (RECAPTCHA_SITE_KEY && !recaptchaToken)}
                  data-testid="submit-soumission-btn"
                >
                  {loading ? (
                    'Envoi en cours...'
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Envoyer ma demande
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
