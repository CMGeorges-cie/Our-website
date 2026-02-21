import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Paintbrush, 
  Sofa, 
  Code, 
  ArrowRight, 
  Shield, 
  Clock, 
  CheckCircle,
  Star
} from 'lucide-react';

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
