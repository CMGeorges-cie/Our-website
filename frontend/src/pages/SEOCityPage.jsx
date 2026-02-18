import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, ArrowRight, MapPin, Phone } from 'lucide-react';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK } from '@/lib/utils';

const cityData = {
  'montreal': {
    name: 'Montréal',
    region: 'Île de Montréal',
    description: 'Services professionnels de peinture, rénovation, assemblage mobilier et développement web dans tout Montréal.',
    neighborhoods: ['Plateau Mont-Royal', 'Rosemont', 'Villeray', 'Ahuntsic', 'Côte-des-Neiges', 'NDG', 'Verdun', 'Hochelaga', 'Centre-ville']
  },
  'longueuil': {
    name: 'Longueuil',
    region: 'Rive-Sud',
    description: 'Votre partenaire de confiance pour la peinture, assemblage IKEA et services tech à Longueuil et environs.',
    neighborhoods: ['Vieux-Longueuil', 'Saint-Hubert', 'Greenfield Park', 'LeMoyne']
  },
  'brossard': {
    name: 'Brossard',
    region: 'Rive-Sud',
    description: 'Services de rénovation, assemblage mobilier et développement web à Brossard. Qualité garantie.',
    neighborhoods: ['Quartier DIX30', 'Secteur A', 'Secteur B', 'Secteur C']
  },
  'laval': {
    name: 'Laval',
    region: 'Laval',
    description: 'CMGeorges dessert toute l\'île de Laval pour vos projets de peinture, meubles et tech.',
    neighborhoods: ['Chomedey', 'Vimont', 'Sainte-Dorothée', 'Duvernay', 'Pont-Viau']
  },
  'ville-saint-laurent': {
    name: 'Ville Saint-Laurent',
    region: 'Montréal',
    description: 'Services professionnels pour résidents et entreprises de Ville Saint-Laurent.',
    neighborhoods: ['Bois-Franc', 'Norgate', 'Côte-Vertu']
  }
};

const services = [
  { name: 'Peinture intérieure', icon: '🎨', desc: 'Murs, plafonds, boiseries' },
  { name: 'Peinture extérieure', icon: '🏠', desc: 'Balcons, clôtures, portes' },
  { name: 'Assemblage IKEA', icon: '🛋️', desc: 'Tous les meubles IKEA' },
  { name: 'Assemblage JYSK', icon: '🛏️', desc: 'Lits, commodes, bureaux' },
  { name: 'Installation TV', icon: '📺', desc: 'Fixation murale sécuritaire' },
  { name: 'Sites web', icon: '💻', desc: 'Vitrine, e-commerce' }
];

export default function SEOCityPage() {
  const { city } = useParams();
  const data = cityData[city] || cityData['montreal'];

  const pageTitle = `Services CMGeorges à ${data.name} | Peinture, Mobilier, Tech`;
  const pageDescription = data.description;

  return (
    <div className="min-h-screen" data-testid={`seo-page-${city}`}>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={`peinture ${data.name}, assemblage IKEA ${data.name}, rénovation ${data.name}, développement web ${data.name}`} />
        <link rel="canonical" href={`https://cmgeorges.com/services/${city}`} />
      </Helmet>

      {/* Hero */}
      <section className="bg-[#1a365d] py-20">
        <div className="container-main">
          <div className="flex items-center gap-2 text-[#d4af37] mb-4">
            <MapPin className="h-5 w-5" />
            <span className="text-sm font-medium">{data.region}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 font-['Outfit']">
            Services CMGeorges à <span className="text-[#d4af37]">{data.name}</span>
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-2xl">
            {data.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/soumission">
              <Button className="btn-accent" size="lg">
                Soumission gratuite
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href={CMGEORGES_PHONE_LINK}>
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-[#1a365d]" size="lg">
                <Phone className="mr-2 h-5 w-5" />
                {CMGEORGES_PHONE}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-spacing bg-white">
        <div className="container-main">
          <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit'] text-center">
            Nos services à {data.name}
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Une équipe locale et professionnelle pour tous vos projets.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {services.map((service, idx) => (
              <Card key={idx} className="p-6 text-center hover-lift">
                <span className="text-4xl mb-4 block">{service.icon}</span>
                <h3 className="font-semibold text-[#1a365d] mb-2">{service.name}</h3>
                <p className="text-sm text-gray-500">{service.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Neighborhoods */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="container-main">
          <h2 className="text-2xl font-bold text-[#1a365d] mb-8 font-['Outfit']">
            Quartiers desservis à {data.name}
          </h2>
          <div className="flex flex-wrap gap-3">
            {data.neighborhoods.map((neighborhood, idx) => (
              <span 
                key={idx}
                className="px-4 py-2 bg-white rounded-full text-sm text-gray-700 shadow-sm"
              >
                {neighborhood}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-spacing bg-white">
        <div className="container-main">
          <h2 className="text-2xl font-bold text-[#1a365d] mb-8 font-['Outfit']">
            Pourquoi choisir CMGeorges à {data.name}?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              'Service rapide et fiable',
              'Prix compétitifs et transparents',
              'Équipe locale et expérimentée',
              'Garantie satisfaction 100%',
              'Soumission gratuite en 24h',
              'Disponible 7 jours sur 7'
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-[#d4af37]" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#d4af37]">
        <div className="container-main text-center">
          <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
            Besoin d'un service à {data.name}?
          </h2>
          <p className="text-[#1a365d]/80 mb-8">
            Obtenez une soumission gratuite en quelques minutes.
          </p>
          <Link to="/soumission">
            <Button size="lg" className="btn-primary">
              Demander une soumission
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Schema.org LocalBusiness */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "CMGeorges",
          "description": data.description,
          "telephone": "+1-514-386-1743",
          "email": "info@cmgeorges.com",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": data.name,
            "addressRegion": "QC",
            "addressCountry": "CA"
          },
          "areaServed": {
            "@type": "City",
            "name": data.name
          },
          "priceRange": "$$"
        })}
      </script>
    </div>
  );
}
