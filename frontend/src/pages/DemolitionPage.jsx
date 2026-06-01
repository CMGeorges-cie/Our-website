import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, ArrowRight, CheckCircle, Shield, Truck, FileText, Building2, ChefHat, Bath, LayoutGrid, Home, Layers, Trees, Hammer } from 'lucide-react';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK } from '@/lib/utils';
import { BRAND } from '@/config/brand';

const NBSP = '\u00a0';

const services = [
  { icon: ChefHat, label: 'Cuisine complète', desc: 'Armoires, comptoir, évier' },
  { icon: Bath, label: 'Salle de bain', desc: 'Vanité, bain, carreaux' },
  { icon: LayoutGrid, label: 'Cloisons & murs de gypse', desc: 'Démolition partielle ou complète' },
  { icon: Home, label: 'Sous-sol', desc: 'Finition complète à enlever' },
  { icon: Layers, label: 'Planchers', desc: 'Bois, vinyle, céramique' },
  { icon: Trees, label: 'Cabanon & extérieur léger', desc: 'Structures démontables' },
  { icon: Hammer, label: 'Démolition sur mesure', desc: 'Selon vos besoins précis' },
];

const guarantees = [
  'Travail propre et sécuritaire',
  'Débris regroupés et évacuation disponible',
  'Estimé écrit avant chaque travail',
  'Délais respectés (1-3 jours selon le chantier)',
  'Résidentiel & Commercial bienvenus',
];

const faqs = [
  {
    q: `Combien de temps prend une démolition${NBSP}?`,
    a: `La plupart des démolitions intérieures résidentielles se font en 1 à 3 jours selon la pièce. Une cuisine ou salle de bain prend généralement 1 journée; un sous-sol complet peut prendre 2 à 3 jours. Nous précisons toujours le délai exact dans l'estimé.`,
  },
  {
    q: `Évacuez-vous les débris${NBSP}?`,
    a: `Oui, l'évacuation est disponible en supplément selon le volume. Nous pouvons aussi coordonner la location d'une benne dumpster si nécessaire.`,
  },
  {
    q: `Travaillez-vous pour les entrepreneurs généraux${NBSP}?`,
    a: `Absolument. Nous sommes disponibles comme sous-traitant de démolition pour les contracteurs, promoteurs et gestionnaires d'immeubles. Tarifs adaptés pour les projets récurrents.`,
  },
  {
    q: `Quelles zones desservez-vous${NBSP}?`,
    a: `Longueuil, Brossard, Saint-Lambert, Saint-Hubert, Boucherville, La Prairie, Candiac, Greenfield Park et Montréal (île).`,
  },
];

export default function DemolitionPage() {
  return (
    <div className="min-h-screen" data-testid="demolition-page">
      <Helmet>
        <title>Démolition résidentielle | Déco Touché</title>
        <meta
          name="description"
          content="Service de démolition intérieure rapide, propre et professionnel. Cuisine, salle de bain, sous-sol, planchers. Estimé gratuit sous 48h."
        />
        <meta name="keywords" content="démolition résidentielle Longueuil, démolition cuisine Rive-Sud, démolition salle de bain Brossard, démolition sous-sol Montréal" />
      </Helmet>

      {/* Hero */}
      <section className="relative bg-[#1a365d] py-20 overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1920&auto=format&fit=crop&q=80"
            alt="Chantier de démolition"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a365d] via-[#1a365d]/95 to-[#1a365d]/70" />
        </div>
        <div className="container-main relative z-10">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 bg-[#d4af37]/20 text-[#d4af37] rounded-full text-xs font-semibold mb-4">
              NOUVEAU SERVICE
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 font-['Outfit']">
              Démolition résidentielle <span className="text-[#d4af37]">& commerciale</span>
            </h1>
            <p className="text-xl text-white/90 mb-2 font-medium">{`Vous rénovez${NBSP}? On démolit tout.`}</p>
            <p className="text-white/70 mb-8">Rapide · Propre · Professionnel</p>
            <p className="text-white/80 mb-8 leading-relaxed">
              {`Avant de rénover, il faut démolir. ${BRAND.name} prend en charge la démolition complète de vos espaces intérieurs, proprement et rapidement — pour que votre entrepreneur puisse commencer sur un chantier prêt dès le lendemain.`}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/soumission?service=demolition">
                <Button className="bg-[#d4af37] text-[#1a365d] hover:bg-[#d4af37]/90 text-lg px-8 py-6 font-semibold" data-testid="demo-cta-quote">
                  Obtenir un estimé gratuit <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href={CMGEORGES_PHONE_LINK}>
                <Button variant="outline" className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-[#1a365d]">
                  <Phone className="mr-2 h-5 w-5" /> {CMGEORGES_PHONE}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-spacing bg-[#F8FAFC]">
        <div className="container-main">
          <h2 className="text-3xl font-bold text-[#1a365d] mb-2 font-['Outfit']">{`Ce qu'on démolit`}</h2>
          <p className="text-gray-600 mb-10">Intérieur résidentiel et commercial — du plus simple au plus complexe.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="hover-lift border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-[#1a365d] flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-[#d4af37]" />
                    </div>
                    <h3 className="font-semibold text-lg text-[#1a365d] mb-1">{s.label}</h3>
                    <p className="text-sm text-gray-600">{s.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section-spacing bg-white">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-[#1a365d] mb-3 font-['Outfit']">Tarification simple et transparente</h2>
            <div className="bg-gradient-to-br from-[#1a365d] to-[#0f2a4d] rounded-2xl p-10 text-white mt-6 shadow-xl">
              <div className="text-sm uppercase tracking-widest text-[#d4af37] mb-2">À partir de</div>
              <div className="text-6xl font-black mb-2">200<span className="text-3xl align-top">$</span></div>
              <p className="text-white/80">Estimé gratuit sous 48 heures</p>
              <p className="text-white/60 text-sm mt-2">Évacuation des débris disponible en supplément</p>
            </div>
          </div>
        </div>
      </section>

      {/* Garanties */}
      <section className="section-spacing bg-[#F8FAFC]">
        <div className="container-main">
          <h2 className="text-3xl font-bold text-[#1a365d] mb-8 font-['Outfit'] text-center">Pourquoi nous choisir</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {guarantees.map((g) => (
              <div key={g} className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm">
                <CheckCircle className="h-5 w-5 text-[#d4af37] flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 text-sm">{g}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="section-spacing bg-white">
        <div className="container-main">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-2 border-[#1a365d]/10">
              <CardContent className="p-8 text-center">
                <Building2 className="h-10 w-10 text-[#d4af37] mx-auto mb-4" />
                <h3 className="font-bold text-xl text-[#1a365d] mb-2">Particuliers</h3>
                <p className="text-gray-600 text-sm">{`Vous démarrez une rénovation${NBSP}? On enlève l'ancien pour vous, sans stress.`}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-[#d4af37]/30 bg-[#1a365d] text-white">
              <CardContent className="p-8 text-center">
                <Truck className="h-10 w-10 text-[#d4af37] mx-auto mb-4" />
                <h3 className="font-bold text-xl text-white mb-2">Entrepreneurs généraux</h3>
                <p className="text-white/80 text-sm">Sous-traitant fiable pour vos chantiers. Disponibilité rapide, facturation propre.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-spacing bg-[#F8FAFC]">
        <div className="container-main max-w-3xl">
          <h2 className="text-3xl font-bold text-[#1a365d] mb-8 font-['Outfit']">Questions fréquentes</h2>
          <div className="space-y-4">
            {faqs.map((f, idx) => (
              <Card key={idx} className="border-0 shadow-sm" data-testid={`demo-faq-${idx}`}>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-[#1a365d] mb-2 flex items-start gap-2">
                    <FileText className="h-5 w-5 text-[#d4af37] flex-shrink-0 mt-0.5" />
                    {f.q}
                  </h3>
                  <p className="text-gray-600 text-sm pl-7">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main text-center">
          <Shield className="h-12 w-12 text-[#d4af37] mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-3 font-['Outfit']">{`Prêt à commencer votre rénovation${NBSP}?`}</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Obtenez un estimé gratuit sous 48h. Aucune obligation, aucun frais caché.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/soumission?service=demolition">
              <Button className="bg-[#d4af37] text-[#1a365d] hover:bg-[#d4af37]/90 text-lg px-8 py-6 font-semibold">
                Estimé gratuit <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href={CMGEORGES_PHONE_LINK}>
              <Button variant="outline" className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-[#1a365d]">
                <Phone className="mr-2 h-5 w-5" /> {CMGEORGES_PHONE}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
