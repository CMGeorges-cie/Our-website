import { CatalogPriceList } from '@/components/public/CatalogPricing';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Hammer, CheckCircle, ArrowRight, Phone } from 'lucide-react';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK } from '@/lib/utils';

const services = [
  'Pose et remplacement de planchers (flottant, vinyle)',
  'Installation de moulures et plinthes',
  'Réparation et remplacement de cloisons sèches (gyproc)',
  'Calfeutrage de portes et fenêtres',
  'Pose de céramique (petites surfaces)',
  'Remplacement de portes intérieures',
  'Installation d\'étagères et rangements',
  'Installation de TV murale (support fourni ou par le client)',
  'Retouches après déménagement',
];


export default function RenovationPage() {
  return (
    <div className="min-h-screen" data-testid="renovation-page">
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1772567733034-f483af656d1a?w=1600" alt="Rénovation" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a365d]/90 to-[#1a365d]/60" />
        </div>
        <div className="container-main relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 bg-[#d4af37]/20 text-[#d4af37] px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <Hammer className="h-4 w-4" /> Rénovation
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 font-['Outfit']">Rénovation <span className="text-[#d4af37]">intérieure & extérieure</span></h1>
          <p className="text-white/80 text-lg mb-8">Modernisez votre espace avec des rénovations légères, rapides et professionnelles. Du plancher aux moulures.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/soumission"><Button className="btn-accent text-lg px-8 py-6">Soumission gratuite <ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
            <a href={CMGEORGES_PHONE_LINK}><Button variant="outline" className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-[#1a365d]"><Phone className="mr-2 h-5 w-5" /> {CMGEORGES_PHONE}</Button></a>
          </div>
        </div>
      </section>

      <section className="section-spacing bg-white">
        <div className="container-main">
          <h2 className="text-3xl font-bold text-[#1a365d] text-center mb-12 font-['Outfit']">Nos prestations de rénovation</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {services.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-[#d4af37] flex-shrink-0" />
                <span className="text-gray-700 text-sm">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-spacing bg-gray-50">
        <div className="container-main">
          <h2 className="text-3xl font-bold text-[#1a365d] text-center mb-4 font-['Outfit']">Tarifs indicatifs</h2>
          <p className="text-gray-500 text-center mb-12 text-sm">Contactez-nous pour une évaluation gratuite de votre projet.</p>
          <CatalogPriceList categories={['renovation']} />
        </div>
      </section>

      <section className="py-16 bg-[#d4af37]">
        <div className="container-main text-center">
          <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">Prêt à rénover?</h2>
          <Link to="/soumission"><Button className="bg-[#1a365d] text-white hover:bg-[#1a365d]/90 text-lg px-8 py-6">Demander une soumission <ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
        </div>
      </section>
    </div>
  );
}
