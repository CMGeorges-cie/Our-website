import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paintbrush, Hammer, Wrench, Sofa, ArrowRight, CheckCircle, Flame, Snowflake, Tv, Sparkles } from 'lucide-react';
import { CatalogFromPrice } from '@/components/public/CatalogPricing';

const services = [
  {
    icon: Flame,
    title: 'Murs Accent — Cheminée & Télé',
    description: 'Transformez votre salon en un weekend. Panneaux rainurés, pierre, béton ciré — cheminée électrique CSA incluse. Forfait tout inclus.',
    href: '/murs-accent',
    image: '/portfolio/murs/mod-a-noir-rainure.jpg',
    features: ['Cheminée électrique CSA', 'Support TV mural', 'Panneaux sur mesure', '4 modèles disponibles'],
    categories: ['accent_walls'],
    highlight: true,
  },
  {
    icon: Paintbrush,
    title: 'Peinture intérieure & extérieure',
    description: 'Transformez vos espaces avec une peinture professionnelle. Murs, plafonds, boiseries, façades extérieures.',
    href: '/services/peinture',
    image: 'https://images.unsplash.com/photo-1768839725085-829e6ac7ac26?w=600',
    features: ['Murs & plafonds', 'Façades extérieures', 'Boiseries & moulures', 'Retouches'],
    categories: ['painting'],
  },
  {
    icon: Hammer,
    title: 'Rénovation légère',
    description: 'Rénovations intérieures pour moderniser votre espace. Planchers, moulures, cloisons sèches.',
    href: '/services/renovation',
    image: 'https://images.unsplash.com/photo-1772567733034-f483af656d1a?w=600',
    features: ['Planchers', 'Moulures & plinthes', 'Gyproc', 'Calfeutrage'],
    categories: ['renovation'],
  },
  {
    icon: Wrench,
    title: 'Entretien général',
    description: 'Petits travaux et entretien régulier pour maintenir votre propriété en parfait état.',
    href: '/services/entretien',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600',
    features: ['Réparations', 'Joints & scellants', 'Entretien saisonnier', 'Nettoyage'],
    categories: ['maintenance'],
  },
  {
    icon: Sofa,
    title: 'Installation de mobilier',
    description: 'Assemblage et installation professionnelle de meubles IKEA, Wayfair et plus.',
    href: '/services/mobilier',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
    features: ['Assemblage IKEA', 'Montage mural', 'Déménagement léger', 'Organisation'],
    categories: ['furniture'],
  },
  {
    icon: Sparkles,
    title: 'Décoration — Vente + Installation',
    description: 'Nouveau : on vend ET on installe ta déco. Miroirs LED, murs-galeries, foyers électriques, papier peint, stores sur mesure — chaque prix est expliqué, produit et pose compris.',
    href: '/services/decoration',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600',
    features: ['Paniers tout inclus dès 429 $', 'Mesure 49 $ déduite', 'Pose au niveau laser', 'Aucune modification au bâtiment'],
    categories: ['decoration'],
    testId: 'service-card-decoration',
  },
  {
    icon: Snowflake,
    title: 'Climatiseurs & thermopompes murales',
    description: 'Nettoyage, entretien et installation de climatiseurs et thermopompes murales pour un air sain et un rendement optimal.',
    href: '/services/climatiseurs',
    image: 'https://images.unsplash.com/photo-1631545806609-35d4ae440431?w=600',
    features: ['Nettoyage complet', 'Entretien saisonnier', 'Installation', 'Diagnostic'],
    categories: ['hvac'],
    testId: 'service-card-hvac',
  },
  {
    icon: Tv,
    title: 'Installation TV & Tech',
    description: 'Installation murale de téléviseurs, câblage dissimulé, configuration audio-vidéo et solutions technologiques.',
    href: '/services/tv-tech',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600',
    features: ['Support TV mural', 'Câblage dissimulé', 'Barre de son', 'Site web & tech'],
    categories: ['installation', 'tech'],
    testId: 'service-card-tech',
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
              <Card key={i} className="border-0 shadow-lg overflow-hidden" data-testid={service.testId || `service-${i}`}>
                <div className={`grid md:grid-cols-2 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                  <div className={`relative h-64 md:h-auto ${i % 2 === 1 ? 'md:order-2' : ''}`}>
                    <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 bg-white/90 text-[#1a365d] px-3 py-1 rounded-full text-xs font-semibold">
                      <CatalogFromPrice categories={service.categories} />
                    </div>
                  </div>
                  <CardContent className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[#d4af37]/10 rounded-lg flex items-center justify-center">
                        <service.icon className="h-5 w-5 text-[#d4af37]" />
                      </div>
                      <h3 className="text-xl font-bold text-white font-['Outfit']">{service.title}</h3>
                    </div>
                    <p className="text-gray-300 mb-6">{service.description}</p>
                    <ul className="grid grid-cols-2 gap-2 mb-6">
                      {service.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
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
