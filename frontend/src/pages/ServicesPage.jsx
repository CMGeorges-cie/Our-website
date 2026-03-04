import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePageTitle } from '@/hooks/usePageTitle';
import { 
  Paintbrush, 
  Sofa, 
  Code, 
  ArrowRight, 
  CheckCircle
} from 'lucide-react';

const services = [
  {
    id: 'deco-touche',
    title: 'Déco Touché',
    subtitle: 'Peinture & Rénovation',
    description: 'Transformez votre espace de vie avec nos services professionnels de peinture et rénovation légère.',
    icon: Paintbrush,
    color: 'bg-[#1a365d]',
    features: [
      'Peinture intérieure et extérieure',
      'Rénovation légère (plâtre, joints)',
      'Entretien général',
      'Installation décoration',
      'Réparation de murs et plafonds',
      'Finition et retouches'
    ],
    pricing: 'À partir de 250$',
    image: 'https://images.unsplash.com/photo-1652766825080-88818e6509b6?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'
  },
  {
    id: 'mobilier',
    title: 'Mobilier & Installation',
    subtitle: 'Service clé en main',
    description: 'De la fourniture à l\'installation sécuritaire, nous nous occupons de tout votre mobilier.',
    icon: Sofa,
    color: 'bg-[#E07A5F]',
    features: [
      'Assemblage IKEA, JYSK, Structube',
      'Livraison incluse',
      'Ancrage mural sécuritaire',
      'Garantie installation',
      'Fourniture optionnelle',
      'Prix compétitifs vs marché'
    ],
    pricing: 'À partir de 75$/meuble',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
    featured: true
  },
  {
    id: 'tech',
    title: 'CMGeorges Tech',
    subtitle: 'Solutions Numériques',
    description: 'Propulsez votre entreprise avec des solutions web et DevOps sur mesure.',
    icon: Code,
    color: 'bg-[#007AFF]',
    features: [
      'Sites web sur mesure',
      'Applications web modernes',
      'DevOps et Cloud (AWS, GCP)',
      'Maintenance et support',
      'SEO et optimisation',
      'Intégrations API'
    ],
    pricing: 'Sur devis',
    image: 'https://images.unsplash.com/photo-1681583484651-281ae2defb17?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',
    dark: true
  }
];

export default function ServicesPage() {
  usePageTitle('Nos Services - Peinture, Mobilier & Tech');
  
  return (
    <div className="min-h-screen" data-testid="services-page">
      {/* Header */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            Nos Services
          </h1>
          <p className="text-white/80 max-w-2xl">
            Trois divisions d'expertise pour répondre à tous vos besoins, 
            de la rénovation au numérique.
          </p>
        </div>
      </section>

      {/* Services List */}
      <section className="section-spacing bg-[#F8FAFC]">
        <div className="container-main space-y-24">
          {services.map((service, index) => {
            const Icon = service.icon;
            const isReversed = index % 2 === 1;
            
            return (
              <div 
                key={service.id}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${isReversed ? 'lg:flex-row-reverse' : ''}`}
                data-testid={`service-detail-${service.id}`}
              >
                <div className={isReversed ? 'lg:order-2' : ''}>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${service.color} text-white text-sm font-medium mb-4`}>
                    <Icon className="h-4 w-4" />
                    {service.subtitle}
                  </div>
                  <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
                    {service.title}
                  </h2>
                  <p className="text-gray-600 mb-6 text-lg">
                    {service.description}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-[#d4af37] flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-sm text-gray-500">À partir de</span>
                      <p className="text-2xl font-bold text-[#1a365d] font-['Outfit']">
                        {service.pricing}
                      </p>
                    </div>
                    <Link to="/soumission">
                      <Button className="btn-accent">
                        Demander un devis
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className={isReversed ? 'lg:order-1' : ''}>
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                    <img 
                      src={service.image} 
                      alt={service.title}
                      className="w-full h-[400px] object-cover"
                    />
                    {service.featured && (
                      <div className="absolute top-4 right-4 px-4 py-2 bg-[#d4af37] text-[#1a365d] font-bold rounded-full text-sm">
                        NOUVEAU
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#1a365d]">
        <div className="container-main text-center">
          <h2 className="text-3xl font-bold text-white mb-4 font-['Outfit']">
            Un projet en tête?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Contactez-nous pour une soumission gratuite et sans engagement.
          </p>
          <Link to="/soumission">
            <Button size="lg" className="btn-accent">
              Obtenir une soumission
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
