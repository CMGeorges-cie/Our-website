import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { publicApi } from '@/lib/api';
import { 
  Paintbrush, 
  Sofa, 
  Code, 
  ArrowRight, 
  Shield, 
  Clock, 
  CheckCircle,
  Star,
  Users,
  Receipt,
  Calendar,
  ExternalLink
} from 'lucide-react';

const SERVICEFLOW_LOGO = "https://customer-assets.emergentagent.com/job_57c7ca12-f939-4f77-840a-6e3a2010ce9e/artifacts/xu0d6vd3_ChatGPT%20Image%20Mar%2011%2C%202026%2C%2011_52_31%20PM.png";

const services = [
  {
    id: 'deco-touche',
    title: 'Déco Touché',
    description: 'Peinture, entretien et rénovation légère pour transformer votre espace de vie.',
    icon: Paintbrush,
    color: 'bg-[#1a365d]',
    textColor: 'text-white',
    accentColor: 'text-[#d4af37]',
    features: ['Peinture intérieure/extérieure', 'Rénovation légère', 'Entretien général'],
    image: 'https://images.unsplash.com/photo-1652766825080-88818e6509b6?crop=entropy&cs=srgb&fm=jpg&q=85&w=600',
    link: '/services'
  },
  {
    id: 'mobilier',
    title: 'Mobilier & Installation',
    description: 'Service clé en main: fourniture, livraison, assemblage et installation sécuritaire.',
    icon: Sofa,
    color: 'bg-white',
    textColor: 'text-[#1a365d]',
    accentColor: 'text-[#E07A5F]',
    features: ['Assemblage IKEA/JYSK', 'Livraison incluse', 'Ancrage mural'],
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
    link: '/mobilier'
  },
  {
    id: 'tech',
    title: 'CMGeorges Tech',
    description: 'Solutions web, développement et DevOps pour propulser votre entreprise.',
    icon: Code,
    color: 'bg-slate-900',
    textColor: 'text-white',
    accentColor: 'text-[#007AFF]',
    features: ['Sites web sur mesure', 'Applications web', 'DevOps & Cloud'],
    image: 'https://images.unsplash.com/photo-1681583484651-281ae2defb17?crop=entropy&cs=srgb&fm=jpg&q=85&w=600',
    link: '/services'
  }
];

const testimonials = [
  {
    name: 'Marie T.',
    location: 'Montréal',
    text: 'Service impeccable! L\'équipe a transformé notre salon en un temps record.',
    rating: 5
  },
  {
    name: 'Jean-Pierre L.',
    location: 'Longueuil',
    text: 'Assemblage de tous nos meubles IKEA en une journée. Professionnel et soigné.',
    rating: 5
  },
  {
    name: 'Sophie M.',
    location: 'Brossard',
    text: 'Notre nouveau site web a doublé nos demandes de clients. Excellent travail!',
    rating: 5
  }
];

const platformIcons = {
  instagram: '📸',
  tiktok: '🎵',
  facebook: '👍',
  youtube: '▶️'
};

function SocialMediaSection() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    publicApi.getSocialPosts()
      .then(res => setPosts(res.data))
      .catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="section-spacing bg-[#0f0f1a]" data-testid="social-section">
      <div className="container-main">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            Suivez-nous sur les <span className="text-[#d4af37]">réseaux sociaux</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Découvrez nos derniers projets et transformations en vidéo
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.slice(0, 8).map((post) => (
            <a
              key={post.id}
              href={post.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square rounded-xl overflow-hidden"
              data-testid={`social-public-${post.id}`}
            >
              <img
                src={post.thumbnail_url}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center">
                  <ExternalLink className="h-6 w-6 text-white mx-auto mb-1" />
                  <span className="text-white text-xs font-medium">
                    {platformIcons[post.platform]} Voir sur {post.platform === 'instagram' ? 'Instagram' : post.platform === 'tiktok' ? 'TikTok' : post.platform}
                  </span>
                </div>
              </div>
              <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                {platformIcons[post.platform]}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div data-testid="home-page">
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center" data-testid="hero-section">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1647082550285-119acfd169f2?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920)'
          }}
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="container-main relative z-10 py-20">
          <div className="max-w-2xl animate-fade-in">
            <span className="inline-block px-4 py-2 bg-[#d4af37] text-[#1a365d] text-sm font-semibold rounded-full mb-6">
              Montréal & Rive-Sud
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 font-['Outfit'] leading-tight">
              Votre partenaire pour 
              <span className="text-[#d4af37]"> tous vos projets</span>
            </h1>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Rénovation, assemblage mobilier ou solutions tech — CMGeorges vous accompagne 
              avec professionnalisme et garantie de satisfaction.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/soumission">
                <Button className="btn-accent w-full sm:w-auto" size="lg" data-testid="hero-soumission-btn">
                  Soumission gratuite
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-[#1a365d] w-full sm:w-auto" size="lg">
                  Découvrir nos services
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white py-8 border-b border-gray-100">
        <div className="container-main">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2 text-gray-600">
              <Shield className="h-5 w-5 text-[#1a365d]" />
              <span className="text-sm font-medium">Travail garanti</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-5 w-5 text-[#1a365d]" />
              <span className="text-sm font-medium">Service rapide</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <CheckCircle className="h-5 w-5 text-[#1a365d]" />
              <span className="text-sm font-medium">Soumission gratuite</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Star className="h-5 w-5 text-[#d4af37]" />
              <span className="text-sm font-medium">5 étoiles Google</span>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="section-spacing bg-[#F8FAFC]" data-testid="services-section">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
              Nos Services
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Trois divisions d'expertise pour répondre à tous vos besoins, 
              du manuel au numérique.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Card 
                  key={service.id}
                  className={`service-card ${service.id === 'tech' ? 'service-card-tech' : ''} group`}
                  data-testid={`service-card-${service.id}`}
                >
                  <div className="relative h-48 -mx-8 -mt-8 mb-6 overflow-hidden rounded-t-xl">
                    <img 
                      src={service.image} 
                      alt={service.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className={`absolute bottom-4 left-4 p-3 rounded-lg ${service.color}`}>
                      <Icon className={`h-6 w-6 ${service.textColor}`} />
                    </div>
                  </div>
                  <CardContent className="p-0">
                    <h3 className={`text-xl font-bold mb-3 font-['Outfit'] ${service.id === 'tech' ? 'text-white' : 'text-[#1a365d]'}`}>
                      {service.title}
                    </h3>
                    <p className={`text-sm mb-4 ${service.id === 'tech' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {service.description}
                    </p>
                    <ul className="space-y-2 mb-6">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className={`flex items-center gap-2 text-sm ${service.id === 'tech' ? 'text-gray-300' : 'text-gray-700'}`}>
                          <CheckCircle className={`h-4 w-4 ${service.accentColor}`} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link to={service.link}>
                      <Button 
                        variant={service.id === 'tech' ? 'outline' : 'default'}
                        className={service.id === 'tech' ? 'border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF] hover:text-white' : 'btn-primary'}
                      >
                        En savoir plus
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-spacing bg-[#1a365d]" data-testid="why-choose-section">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-['Outfit']">
                Pourquoi choisir 
                <span className="text-[#d4af37]"> CMGeorges?</span>
              </h2>
              <div className="space-y-6">
                {[
                  { title: 'Expertise locale', desc: 'Plus de 10 ans d\'expérience sur le marché de Montréal et de la Rive-Sud.' },
                  { title: 'Prix transparents', desc: 'Soumissions détaillées avec comparatif prix marché. Pas de surprise.' },
                  { title: 'Garantie satisfaction', desc: 'Nous ne partons pas tant que vous n\'êtes pas 100% satisfait.' },
                  { title: 'Service complet', desc: 'Du conseil à la réalisation, un seul interlocuteur pour tous vos projets.' }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#d4af37] flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-[#1a365d]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                      <p className="text-white/70 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.pexels.com/photos/6146704/pexels-photo-6146704.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Équipe multiculturelle CMGeorges"
                className="rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-6 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-[#1a365d] font-['Outfit']">500+</div>
                  <div className="text-sm text-gray-600">
                    Projets<br/>complétés
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-spacing bg-white" data-testid="testimonials-section">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
              Ce que disent nos clients
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="p-6 hover-lift" data-testid={`testimonial-${idx}`}>
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-[#d4af37] text-[#d4af37]" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a365d] flex items-center justify-center text-white font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a365d]">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.location}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ServiceFlow Section */}
      <section className="section-spacing bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#23153c] relative overflow-hidden" data-testid="serviceflow-section">
        {/* Background effects */}
        <div className="absolute w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl -top-48 -right-48"></div>
        <div className="absolute w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl bottom-0 left-0"></div>
        
        <div className="container-main relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div>
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 mb-6 text-sm">
                <span className="text-white/60">Notre produit interne</span>
              </span>
              
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src={SERVICEFLOW_LOGO} 
                  alt="ServiceFlow" 
                  className="w-14 h-14 rounded-xl shadow-lg shadow-[#d4af37]/30"
                />
                <span className="text-3xl font-black text-white tracking-tight font-['Outfit']">
                  Service<span className="text-[#d4af37]">Flow</span>
                </span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 font-['Outfit']">
                L'outil que nous utilisons pour gérer nos projets efficacement
              </h2>
              
              <p className="text-white/70 mb-6 leading-relaxed">
                Nous avons développé une plateforme interne pour gérer nos clients, projets, factures et travaux de maintenance. 
                Nous la rendons maintenant disponible pour d'autres entreprises de services.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { icon: Users, label: 'Gestion clients' },
                  { icon: Receipt, label: 'Facturation' },
                  { icon: Calendar, label: 'Planification' },
                  { icon: CheckCircle, label: 'Suivi projets' },
                ].map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <div key={idx} className="flex items-center gap-3 text-white/80">
                      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[#d4af37]" />
                      </div>
                      <span className="text-sm">{feature.label}</span>
                    </div>
                  );
                })}
              </div>
              
              <Link to="/serviceflow">
                <Button size="lg" className="bg-[#d4af37] hover:bg-[#c9a432] text-[#1a365d] font-bold">
                  Découvrir ServiceFlow
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            
            {/* Right - Preview card */}
            <div className="relative">
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                  <img 
                    src={SERVICEFLOW_LOGO} 
                    alt="ServiceFlow" 
                    className="w-8 h-8 rounded-lg"
                  />
                  <span className="text-lg font-bold text-white font-['Outfit']">
                    Service<span className="text-[#d4af37]">Flow</span>
                  </span>
                  <span className="ml-auto text-xs text-white/40">Dashboard</span>
                </div>
                
                {/* Mock stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Clients', value: '156' },
                    { label: 'Projets', value: '43' },
                    { label: 'Revenus', value: '$89K' },
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-white/5 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-[#d4af37]">{stat.value}</div>
                      <div className="text-xs text-white/50">{stat.label}</div>
                    </div>
                  ))}
                </div>
                
                {/* Mock list */}
                <div className="space-y-3">
                  {['Nouveau lead - Marie T.', 'Facture #1234 payée', 'Projet Réno terminé'].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-[#d4af37]"></div>
                      <span className="text-sm text-white/70">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Built by badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-3 shadow-xl flex items-center gap-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_cmgeorges-prod/artifacts/3w0w7gaw_logo_cmgeorges.svg" 
                  alt="CMGeorges"
                  className="h-6 w-auto"
                />
                <div className="text-xs">
                  <div className="font-bold text-[#1a365d]">Built by CMGeorges</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media Section */}
      <SocialMediaSection />

      {/* CTA Section */}
      <section className="py-16 bg-[#d4af37]" data-testid="cta-section">
        <div className="container-main text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
            Prêt à démarrer votre projet?
          </h2>
          <p className="text-[#1a365d]/80 mb-8 max-w-xl mx-auto">
            Obtenez une soumission gratuite et sans engagement en quelques minutes.
          </p>
          <Link to="/soumission">
            <Button size="lg" className="btn-primary" data-testid="cta-soumission-btn">
              Demander une soumission gratuite
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
