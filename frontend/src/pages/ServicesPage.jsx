import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paintbrush, Hammer, Wrench, Sofa, ArrowRight, CheckCircle } from 'lucide-react';

const services = [
  {
    icon: Paintbrush,
    title: 'Peinture intérieure & extérieure',
    description: 'Transformez vos espaces avec une peinture professionnelle. Murs, plafonds, boiseries, façades extérieures.',
    href: '/services/peinture',
    image: 'https://images.unsplash.com/photo-1768839725085-829e6ac7ac26?w=600',
    features: ['Murs & plafonds', 'Façades extérieures', 'Boiseries & moulures', 'Retouches'],
    priceFrom: 'À partir de 350$/pièce',
  },
  {
    icon: Hammer,
    title: 'Rénovation légère',
    description: 'Rénovations intérieures pour moderniser votre espace. Planchers, moulures, cloisons sèches.',
    href: '/services/renovation',
    image: 'https://images.unsplash.com/photo-1772567733034-f483af656d1a?w=600',
    features: ['Planchers', 'Moulures & plinthes', 'Gyproc', 'Calfeutrage'],
    priceFrom: 'Sur devis',
  },
  {
    icon: Wrench,
    title: 'Entretien général',
    description: 'Petits travaux et entretien régulier pour maintenir votre propriété en parfait état.',
    href: '/services/entretien',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600',
    features: ['Réparations', 'Joints & scellants', 'Entretien saisonnier', 'Nettoyage'],
    priceFrom: 'À partir de 120$/visite',
  },
  {
    icon: Sofa,
    title: 'Installation de mobilier',
    description: 'Assemblage et installation professionnelle de meubles IKEA, Wayfair et plus.',
    href: '/services/mobilier',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
    features: ['Assemblage IKEA', 'Montage mural', 'Déménagement léger', 'Organisation'],
    priceFrom: 'À partir de 80$/meuble',
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen" data-testid="services-page">
      <section className="relative py-24 bg-[#1a365d]">
        <div className="container-main text-center">
          <span className="text-[#d4af37] font-semibold text-sm uppercase tracking-wider">Nos services</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mt-2 mb-4 font-['Outfit']">
            Services professionnels <span className="text-[#d4af37]">Déco Touché</span>
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto">
            Peinture, rénovation, entretien et installation de mobilier. 
            Des résultats impeccables pour votre propriété à Montréal et la Rive-Sud.
          </p>
        </div>
      </section>

      <section className="section-spacing bg-white">
        <div className="container-main">
          <div className="grid gap-12">
            {services.map((service, i) => (
              <Card key={i} className="border-0 shadow-lg overflow-hidden" data-testid={`service-${i}`}>
                <div className={`grid md:grid-cols-2 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                  <div className={`relative h-64 md:h-auto ${i % 2 === 1 ? 'md:order-2' : ''}`}>
                    <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 bg-white/90 text-[#1a365d] px-3 py-1 rounded-full text-xs font-semibold">
                      {service.priceFrom}
                    </div>
                  </div>
                  <CardContent className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[#d4af37]/10 rounded-lg flex items-center justify-center">
                        <service.icon className="h-5 w-5 text-[#d4af37]" />
                      </div>
                      <h3 className="text-xl font-bold text-[#1a365d] font-['Outfit']">{service.title}</h3>
                    </div>
                    <p className="text-gray-600 mb-6">{service.description}</p>
                    <ul className="grid grid-cols-2 gap-2 mb-6">
                      {service.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-gray-500">
                          <CheckCircle className="h-4 w-4 text-[#d4af37]" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Link to={service.href}>
                      <Button className="btn-accent">
                        En savoir plus <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#d4af37]">
        <div className="container-main text-center">
          <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">Besoin d'un service?</h2>
          <p className="text-[#1a365d]/70 mb-8">Soumission gratuite et sans engagement. Réponse sous 24h.</p>
          <Link to="/soumission">
            <Button className="bg-[#1a365d] text-white hover:bg-[#1a365d]/90 text-lg px-8 py-6">
              Demander une soumission <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
