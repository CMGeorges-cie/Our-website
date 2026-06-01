import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { publicApi } from '@/lib/api';
import { 
  Paintbrush, 
  Wrench, 
  Hammer,
  Sofa,
  Trash2,
  ArrowRight, 
  Shield, 
  Clock, 
  CheckCircle,
  Star,
  Users,
  Receipt,
  ExternalLink,
  Phone,
  BadgeCheck,
  DollarSign
} from 'lucide-react';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK } from '@/lib/utils';

const services = [
  {
    icon: Paintbrush,
    title: 'Peinture intérieure & extérieure',
    description: 'Transformation complète de vos espaces avec des finitions impeccables. Peinture résidentielle et commerciale.',
    href: '/services/peinture',
    image: 'https://images.unsplash.com/photo-1768839725085-829e6ac7ac26?w=600',
    features: ['Murs & plafonds', 'Boiseries & moulures', 'Façades extérieures', 'Retouches & rafraîchissement']
  },
  {
    icon: Hammer,
    title: 'Rénovation légère',
    description: 'Rénovations intérieures et extérieures pour moderniser votre espace sans les tracas d\'un gros chantier.',
    href: '/services/renovation',
    image: 'https://images.unsplash.com/photo-1772567733034-f483af656d1a?w=600',
    features: ['Pose de planchers', 'Installation de moulures', 'Calfeutrage', 'Petites réparations']
  },
  {
    icon: Wrench,
    title: 'Entretien général',
    description: 'Petits travaux et entretien régulier pour maintenir votre propriété en parfait état toute l\'année.',
    href: '/services/entretien',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600',
    features: ['Réparations mineures', 'Entretien saisonnier', 'Joints & scellants', 'Nettoyage après travaux']
  },
  {
    icon: Sofa,
    title: 'Installation de mobilier',
    description: 'Assemblage et installation professionnelle de meubles IKEA, Wayfair et autres. Service rapide et soigné.',
    href: '/services/mobilier',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
    features: ['Assemblage IKEA', 'Montage mural', 'Déménagement léger', 'Rangement & organisation']
  },
  {
    icon: Trash2,
    title: 'Démolition résidentielle & commerciale',
    description: 'Avant de rénover, on démolit tout — proprement, rapidement, professionnellement. Cuisine, salle de bain, sous-sol, planchers.',
    href: '/services/demolition',
    image: '/portfolio/demolition_hero.jpg',
    features: ['Cuisine complète', 'Salle de bain', 'Sous-sol & cloisons', 'Évacuation débris']
  }
];

const whyChoose = [
  { icon: BadgeCheck, title: 'Travail garanti', desc: 'Garantie de satisfaction sur tous nos travaux de peinture et rénovation.' },
  { icon: DollarSign, title: 'Prix transparents', desc: 'Soumission gratuite et détaillée. Aucune surprise, aucun frais caché.' },
  { icon: Clock, title: 'Respect des délais', desc: 'Nous respectons les échéanciers convenus. Votre temps est précieux.' },
  { icon: Shield, title: 'Assuré & professionnel', desc: 'Assurance responsabilité civile active. Licence RBQ en cours.' },
];

const testimonials = [
  { name: 'Marie-Josée L.', city: 'Longueuil', text: 'Excellent travail de peinture dans notre salon et cuisine. L\'équipe est ponctuelle, propre et très professionnelle. Le résultat est magnifique!', rating: 5 },
  { name: 'Jean-Pierre B.', city: 'Montréal', text: 'Rénovation complète de notre sous-sol. Travail impeccable, respect du budget et des délais. Je recommande sans hésitation.', rating: 5 },
  { name: 'Sophie D.', city: 'Brossard', text: 'L\'assemblage de nos meubles IKEA a été fait en un temps record. Très satisfaite du service, tout est parfaitement monté!', rating: 5 },
];

const platformIcons = {
  instagram: '📸', tiktok: '🎵', facebook: '👍', youtube: '▶️'
};

function SocialMediaSection() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    publicApi.getSocialPosts().then(res => setPosts(res.data)).catch(() => {});
  }, []);
  if (posts.length === 0) return null;

  return (
    <section className="section-spacing bg-[#0f0f1a]" data-testid="social-section">
      <div className="container-main">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            Suivez-nous sur les <span className="text-[#d4af37]">réseaux sociaux</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">Découvrez nos derniers projets et transformations en vidéo</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.slice(0, 8).map((post) => (
            <a key={post.id} href={post.post_url} target="_blank" rel="noopener noreferrer"
              className="group relative aspect-square rounded-xl overflow-hidden" data-testid={`social-public-${post.id}`}>
              <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center">
                  <ExternalLink className="h-6 w-6 text-white mx-auto mb-1" />
                  <span className="text-white text-xs font-medium">
                    {platformIcons[post.platform]} Voir sur {post.platform === 'instagram' ? 'Instagram' : post.platform === 'tiktok' ? 'TikTok' : post.platform}
                  </span>
                </div>
              </div>
              <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">{platformIcons[post.platform]}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1772567733034-f483af656d1a?w=1600" 
            alt="Rénovation intérieure"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a365d]/90 via-[#1a365d]/70 to-transparent" />
        </div>
        <div className="container-main relative z-10">
          <div className="max-w-2xl">
            <span className="inline-block bg-[#d4af37]/20 text-[#d4af37] text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-[#d4af37]/30">
              Peinture & Rénovation — Montréal & Rive-Sud
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 font-['Outfit']" data-testid="hero-title">
              Transformez vos espaces avec <span className="text-[#d4af37]">Déco Touché</span>
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-xl">
              Peinture intérieure et extérieure, rénovation légère et entretien professionnel. 
              Des résultats impeccables, garantis.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/soumission">
                <Button className="btn-accent text-lg px-8 py-6" data-testid="hero-soumission-btn">
                  Soumission gratuite <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href={CMGEORGES_PHONE_LINK}>
                <Button variant="outline" className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-[#1a365d]">
                  <Phone className="mr-2 h-5 w-5" /> Appelez-nous
                </Button>
              </a>
            </div>
            <div className="flex items-center gap-6 mt-8 text-white/70 text-sm">
              <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-[#d4af37]" /> Soumission gratuite</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-[#d4af37]" /> Assuré</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-[#d4af37]" /> Acompte 30-50%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="section-spacing bg-white" data-testid="services-section">
        <div className="container-main">
          <div className="text-center mb-16">
            <span className="text-[#d4af37] font-semibold text-sm uppercase tracking-wider">Nos services</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mt-2 font-['Outfit']">
              Des services professionnels pour votre propriété
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, i) => (
              <Card key={i} className="group border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden" data-testid={`service-card-${i}`}>
                <div className="relative h-48 overflow-hidden">
                  <img src={service.image} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                    <service.icon className="h-5 w-5 text-[#d4af37]" />
                    <h3 className="text-lg font-bold font-['Outfit']">{service.title}</h3>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-gray-600 text-sm mb-4">{service.description}</p>
                  <ul className="grid grid-cols-2 gap-2 mb-4">
                    {service.features.map((f, j) => (
                      <li key={j} className="text-xs text-gray-500 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-[#d4af37]" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={service.href} className="text-[#d4af37] text-sm font-semibold hover:underline flex items-center gap-1">
                    En savoir plus <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="section-spacing bg-gray-50" data-testid="why-choose-section">
        <div className="container-main">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#d4af37] font-semibold text-sm uppercase tracking-wider">Notre engagement</span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mt-2 mb-8 font-['Outfit']">
                Pourquoi choisir <span className="text-[#d4af37]">Déco Touché?</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {whyChoose.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#d4af37]/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-[#d4af37]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#1a365d] text-sm">{item.title}</h4>
                      <p className="text-gray-500 text-xs mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1768839725085-829e6ac7ac26?w=800" 
                alt="Travail professionnel"
                className="w-full rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#d4af37]/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-[#d4af37]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#1a365d]">100+</p>
                    <p className="text-xs text-gray-500">Clients satisfaits</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deposit Info */}
      <section className="py-12 bg-[#1a365d]" data-testid="deposit-section">
        <div className="container-main">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#d4af37]/20 rounded-full flex items-center justify-center">
                <Receipt className="h-6 w-6 text-[#d4af37]" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg font-['Outfit']">Acompte obligatoire de 30 à 50%</h3>
                <p className="text-white/70 text-sm">Un dépôt est requis à la signature du contrat pour confirmer votre réservation. Paiement sécurisé en ligne ou par virement Interac.</p>
              </div>
            </div>
            <Link to="/soumission">
              <Button className="btn-accent whitespace-nowrap">Demander une soumission</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-spacing bg-white" data-testid="testimonials-section">
        <div className="container-main">
          <div className="text-center mb-12">
            <span className="text-[#d4af37] font-semibold text-sm uppercase tracking-wider">Témoignages</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mt-2 font-['Outfit']">Ce que nos clients disent</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <Card key={i} className="border-0 shadow-lg" data-testid={`testimonial-${i}`}>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array(t.rating).fill(0).map((_, j) => (
                      <Star key={j} className="h-4 w-4 text-[#d4af37] fill-[#d4af37]" />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm italic mb-4">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1a365d] flex items-center justify-center text-white font-bold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1a365d] text-sm">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.city}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Media */}
      <SocialMediaSection />

      {/* CTA Section */}
      <section className="py-16 bg-[#d4af37]" data-testid="cta-section">
        <div className="container-main text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
            Prêt à transformer votre espace?
          </h2>
          <p className="text-[#1a365d]/80 mb-8 max-w-2xl mx-auto">
            Obtenez une soumission gratuite et sans engagement. Notre équipe vous répondra sous 24 heures.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/soumission">
              <Button className="bg-[#1a365d] text-white hover:bg-[#1a365d]/90 text-lg px-8 py-6">
                Soumission gratuite <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href={CMGEORGES_PHONE_LINK}>
              <Button variant="outline" className="text-lg px-8 py-6 border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white">
                <Phone className="mr-2 h-5 w-5" /> {CMGEORGES_PHONE}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
