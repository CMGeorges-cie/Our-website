import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Paintbrush, CheckCircle, ArrowRight, Phone, Star, Clock, DollarSign, Shield } from 'lucide-react';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK } from '@/lib/utils';

const services = [
  { title: 'Peinture intérieure', items: ['Murs et plafonds', 'Boiseries et moulures', 'Cuisines et salles de bain', 'Sous-sols et garages', 'Retouches et rafraîchissement'] },
  { title: 'Peinture extérieure', items: ['Revêtements et façades', 'Balcons et terrasses', 'Clôtures et cabanons', 'Portes et fenêtres', 'Préparation et lavage'] },
];

const process = [
  { step: '1', title: 'Consultation gratuite', desc: 'Visite sur place pour évaluer les travaux et vos besoins.' },
  { step: '2', title: 'Soumission détaillée', desc: 'Devis clair avec prix, délais et choix de couleurs.' },
  { step: '3', title: 'Dépôt 30-50%', desc: 'Acompte à la signature pour confirmer la réservation.' },
  { step: '4', title: 'Réalisation', desc: 'Exécution propre et professionnelle selon l\'échéancier.' },
  { step: '5', title: 'Inspection finale', desc: 'Vérification avec vous et retouches si nécessaire.' },
];

const pricing = [
  { service: 'Peinture intérieure (par pièce)', price: 'À partir de 350$', note: 'Taille standard, 2 couches' },
  { service: 'Peinture extérieure', price: 'À partir de 1,500$', note: 'Maison de taille moyenne' },
  { service: 'Retouches & rafraîchissement', price: 'À partir de 150$', note: 'Petites surfaces' },
  { service: 'Préparation de surfaces', price: 'Inclus', note: 'Sablage, apprêt, protection' },
];

export default function PeinturePage() {
  return (
    <div className="min-h-screen" data-testid="peinture-page">
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1768839725085-829e6ac7ac26?w=1600" alt="Peinture" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a365d]/90 to-[#1a365d]/60" />
        </div>
        <div className="container-main relative z-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-[#d4af37]/20 text-[#d4af37] px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              <Paintbrush className="h-4 w-4" /> Service principal
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 font-['Outfit']">
              Peinture intérieure & <span className="text-[#d4af37]">extérieure</span>
            </h1>
            <p className="text-white/80 text-lg mb-8">
              Transformez vos espaces avec une peinture professionnelle. Finitions impeccables, couleurs durables, travail soigné.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/soumission"><Button className="btn-accent text-lg px-8 py-6">Soumission gratuite <ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
              <a href={CMGEORGES_PHONE_LINK}><Button variant="outline" className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-[#1a365d]"><Phone className="mr-2 h-5 w-5" /> {CMGEORGES_PHONE}</Button></a>
            </div>
          </div>
        </div>
      </section>

      {/* Services détaillés */}
      <section className="section-spacing bg-white">
        <div className="container-main">
          <div className="grid md:grid-cols-2 gap-12">
            {services.map((cat, i) => (
              <Card key={i} className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-[#1a365d] mb-6 font-['Outfit']">{cat.title}</h3>
                  <ul className="space-y-3">
                    {cat.items.map((item, j) => (
                      <li key={j} className="flex items-center gap-3 text-gray-600">
                        <CheckCircle className="h-5 w-5 text-[#d4af37] flex-shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section-spacing bg-gray-50">
        <div className="container-main">
          <h2 className="text-3xl font-bold text-[#1a365d] text-center mb-12 font-['Outfit']">Notre processus</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {process.map((p, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-[#d4af37] text-[#1a365d] rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">{p.step}</div>
                <h4 className="font-semibold text-[#1a365d] text-sm mb-2">{p.title}</h4>
                <p className="text-xs text-gray-500">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section className="section-spacing bg-white">
        <div className="container-main">
          <h2 className="text-3xl font-bold text-[#1a365d] text-center mb-4 font-['Outfit']">Tarifs indicatifs</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto text-sm">Chaque projet est unique. Contactez-nous pour une soumission personnalisée et gratuite.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {pricing.map((p, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-[#1a365d] text-sm">{p.service}</p>
                  <p className="text-xs text-gray-400">{p.note}</p>
                </div>
                <span className="font-bold text-[#d4af37] text-sm">{p.price}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">* TPS et TVQ en sus. Acompte de 30 à 50% requis à la signature.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#d4af37]">
        <div className="container-main text-center">
          <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">Prêt à donner un nouveau look à vos murs?</h2>
          <p className="text-[#1a365d]/70 mb-8">Soumission gratuite, sans engagement.</p>
          <Link to="/soumission"><Button className="bg-[#1a365d] text-white hover:bg-[#1a365d]/90 text-lg px-8 py-6">Demander une soumission <ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
        </div>
      </section>
    </div>
  );
}
