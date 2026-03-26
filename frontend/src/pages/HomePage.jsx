import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePageTitle } from '@/hooks/usePageTitle';
import { publicApi } from '@/lib/api';
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

export default function HomePage() {
  usePageTitle('Accueil - Rénovation, Mobilier & Tech à Montréal');
  const [services, setServices] = useState([]);
  const [testimonialsData, setTestimonialsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesResponse, testimonialsResponse] = await Promise.all([
          publicApi.getServices(),
          publicApi.getTestimonials(null, true) // Get featured testimonials
        ]);
        
        setServices(servicesResponse.data);
        setTestimonialsData(testimonialsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback to hardcoded data if API fails
        setTestimonialsData(testimonials);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getServiceIcon = (serviceName) => {
    switch (serviceName) {
      case 'deco-touche':
        return Paintbrush;
      case 'mobilier':
        return Sofa;
      case 'tech-services':
        return Code;
      default:
        return Paintbrush;
    }
  };

  const getServiceColor = (serviceName) => {
    switch (serviceName) {
      case 'deco-touche':
        return 'bg-[#1a365d]';
      case 'mobilier':
        return 'bg-white';
      case 'tech-services':
        return 'bg-slate-900';
      default:
        return 'bg-[#1a365d]';
    }
  };

  const getServiceTextColor = (serviceName) => {
    switch (serviceName) {
      case 'deco-touche':
        return 'text-white';
      case 'mobilier':
        return 'text-[#1a365d]';
      case 'tech-services':
        return 'text-white';
      default:
        return 'text-white';
    }
  };

  const getServiceAccentColor = (serviceName) => {
    switch (serviceName) {
      case 'deco-touche':
        return 'text-[#d4af37]';
      case 'mobilier':
        return 'text-[#E07A5F]';
      case 'tech-services':
        return 'text-[#007AFF]';
      default:
        return 'text-[#d4af37]';
    }
  };

  const getServiceLink = (serviceName) => {
    switch (serviceName) {
      case 'deco-touche':
        return '/services';
      case 'mobilier':
        return '/mobilier';
      case 'tech-services':
        return '/services';
      default:
        return '/services';
    }
  };
  
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

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-t-xl" />
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-5/6 mb-4" />
                    <div className="space-y-2 mb-6">
                      {[1, 2, 3].map(j => (
                        <div key={j} className="h-4 bg-gray-200 rounded w-4/5" />
                      ))}
                    </div>
                    <div className="h-10 bg-gray-200 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children">
              {services.map((service) => {
                const Icon = getServiceIcon(service.name);
                const color = getServiceColor(service.name);
                const textColor = getServiceTextColor(service.name);
                const accentColor = getServiceAccentColor(service.name);
                const link = getServiceLink(service.name);

                return (
                  <Card
                    key={service.id}
                    className={`service-card ${service.name === 'tech-services' ? 'service-card-tech' : ''} group`}
                    data-testid={`service-card-${service.name}`}
                  >
                    <div className="relative h-48 -mx-8 -mt-8 mb-6 overflow-hidden rounded-t-xl">
                      <img
                        src={service.image_url}
                        alt={service.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className={`absolute bottom-4 left-4 p-3 rounded-lg ${color}`}>
                        <Icon className={`h-6 w-6 ${textColor}`} />
                      </div>
                    </div>
                    <CardContent className="p-0">
                      <h3 className={`text-xl font-bold mb-3 font-['Outfit'] ${service.name === 'tech-services' ? 'text-white' : 'text-[#1a365d]'}`}>
                        {service.title}
                      </h3>
                      <p className={`text-sm mb-4 ${service.name === 'tech-services' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {service.description}
                      </p>
                      <ul className="space-y-2 mb-6">
                        {service.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className={`flex items-center gap-2 text-sm ${service.name === 'tech-services' ? 'text-gray-300' : 'text-gray-700'}`}>
                            <CheckCircle className={`h-4 w-4 ${accentColor}`} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Link to={link}>
                        <Button
                          variant={service.name === 'tech-services' ? 'outline' : 'default'}
                          className={service.name === 'tech-services' ? 'border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF] hover:text-white' : 'btn-primary'}
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
          )}
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
            {loading ? (
              // Loading skeleton for testimonials
              Array.from({ length: 3 }).map((_, idx) => (
                <Card key={idx} className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                  <div className="h-16 bg-gray-200 rounded mb-4 animate-pulse"></div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              testimonialsData.map((testimonial, idx) => (
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
              ))
            )}
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
