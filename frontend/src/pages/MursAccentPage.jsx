import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Flame, Tv, Home, Calendar, DollarSign, ShieldCheck,
  ArrowRight, CheckCircle, BookOpen, Mail,
  Hammer, FileText, Handshake, Truck,
  Zap, FileCheck, CreditCard, Camera,
  Sparkles, Star
} from 'lucide-react';

const HERO_IMG = '/portfolio/murs/hero-beton.jpg';

const MODELS = [
  {
    id: 'mod-a',
    code: 'MOD-A',
    name: 'Noir Rainuré Classic',
    badge: { label: 'Populaire', color: 'bg-[#1B3A8C] text-white' },
    image: '/portfolio/murs/mod-a-noir-rainure.jpg',
    desc: 'Panneaux MDF rainurés noir mat, cheminée électrique encastrée, intégration TV. Impact maximum, exécution nette.',
    price: 'À partir de 2 800$',
    duration: 'Forfait tout inclus · 1 weekend · taxes en sus',
    solo: 'Faisable en solo',
    accent: 'border-[#1B3A8C]',
    btnClass: 'bg-[#1B3A8C] hover:bg-[#162e6e] text-white',
    included: [
      'Mesure et plan de pose personnalisés',
      'Panneaux MDF rainurés finition noir mat (jusqu\'à 12 pi de large)',
      'Cheminée électrique encastrée 50" certifiée CSA',
      'Support TV mural + câblage dissimulé dans le mur',
      'Tablette de présentation (optionnelle)',
      'Main-d\'œuvre + nettoyage du chantier',
      'Garantie 1 an main-d\'œuvre + garantie fabricant cheminée',
    ],
  },
  {
    id: 'mod-b',
    code: 'MOD-B',
    name: 'Blanc Classique & Foyer',
    badge: { label: 'Élégant', color: 'bg-[#D4A017] text-[#0A0C14]' },
    image: '/portfolio/murs/mod-b-blanc-classique.jpg',
    desc: 'Mur blanc cassé texturé, tablette de foyer, moulures décoratives. Style cottage chic intemporel.',
    price: 'À partir de 3 200$',
    duration: 'Forfait tout inclus · 1 à 2 weekends · taxes en sus',
    solo: '1 à 2 weekends',
    accent: 'border-[#D4A017]',
    btnClass: 'bg-[#D4A017] hover:bg-[#b88a13] text-[#0A0C14]',
    included: [
      'Mesure, plan de pose et palette de couleurs',
      'Mur texturé peinture haut de gamme Benjamin Moore',
      'Moulures décoratives sur mesure + tablette de foyer',
      'Cheminée électrique encastrée 50" certifiée CSA',
      'Support TV mural + câblage dissimulé',
      'Pose, finition et nettoyage',
      'Garantie 1 an main-d\'œuvre + garantie fabricant cheminée',
    ],
  },
  {
    id: 'mod-c',
    code: 'MOD-C',
    name: 'Béton & Acier Industriel',
    badge: { label: 'Premium', color: 'bg-[#1B3A8C] text-white' },
    image: '/portfolio/murs/mod-c-beton-industriel.jpg',
    desc: 'Enduit béton ciré, profilés acier brossé, cheminée 60" grand format, ruban LED intégré.',
    price: 'À partir de 4 800$',
    duration: 'Forfait tout inclus · ≥2 weekends · taxes en sus',
    solo: '2 weekends',
    accent: 'border-[#1B3A8C]',
    btnClass: 'bg-[#1B3A8C] hover:bg-[#162e6e] text-white',
    included: [
      'Plan détaillé et rendu 3D du projet',
      'Enduit béton ciré (microtopping) finition mate',
      'Profilés acier brossé sur mesure',
      'Cheminée électrique grand format 60" certifiée CSA',
      'Ruban LED intégré avec gradateur',
      'Support TV mural haute charge + câblage 100% caché',
      'Main-d\'œuvre + finition + nettoyage',
      'Garantie 2 ans main-d\'œuvre + garantie fabricant',
    ],
  },
  {
    id: 'mod-d',
    code: 'MOD-D',
    name: 'Pierre & Quartz Naturel',
    badge: { label: 'Nouveau', color: 'bg-[#D4A017] text-[#0A0C14]' },
    image: '/portfolio/murs/mod-d-pierre-naturelle.jpg',
    desc: 'Panneaux Ledgestone empilé ou pierre reconstituée légère. Ambiance chalet luxe ou manoir. Le look le plus haut de gamme.',
    price: 'À partir de 3 800$',
    duration: 'Forfait tout inclus · 1 à 2 weekends · taxes en sus',
    solo: '1 à 2 weekends',
    accent: 'border-[#D4A017]',
    btnClass: 'bg-[#D4A017] hover:bg-[#b88a13] text-[#0A0C14]',
    included: [
      'Mesure, plan de pose et sélection des panneaux',
      'Pierre reconstituée légère type Ledgestone (panneaux empilés)',
      'Cheminée électrique encastrée 50" certifiée CSA',
      'Support TV mural + câblage dissimulé',
      'Tablette de foyer en bois massif ou pierre',
      'Pose, jointoyage et nettoyage',
      'Garantie 1 an main-d\'œuvre + garantie fabricant cheminée',
    ],
  },
];

const FINISHES = [
  { name: 'Rainuré Noir', desc: 'MDF rainuré teinté noir mat. Le look moderne le plus tendance.', model: 'MOD-A', img: '/portfolio/murs/mod-a-noir-rainure.jpg' },
  { name: 'Blanc Texturé', desc: 'Peinture mate blanc cassé avec moulures décoratives en relief.', model: 'MOD-B', img: '/portfolio/murs/mod-b-blanc-classique.jpg' },
  { name: 'Béton Ciré', desc: 'Enduit microtopping effet béton lissé. Industriel et sophistiqué.', model: 'MOD-C', img: '/portfolio/murs/mod-c-beton-industriel.jpg' },
  { name: 'Pierre Empilée', desc: 'Ledgestone reconstituée légère. Ambiance chalet luxe ou manoir.', model: 'MOD-D', img: '/portfolio/murs/mod-d-pierre-naturelle.jpg' },
  { name: 'Porcelaine Marbre', desc: 'Carreaux 24×48" effet marbre. Élégance intemporelle.', model: 'Sur demande', img: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=400&q=70' },
  { name: 'Briques Parement', desc: 'Briques légères ou carreaux briques. Style rustique chaleureux.', model: 'Sur demande', img: 'https://images.unsplash.com/photo-1551410224-699683e15636?w=400&q=70' },
];

const PROCESS = [
  { step: '01', icon: Home, title: 'Consultation gratuite', desc: 'Visite sur place ou vidéo-appel. On mesure, on choisit ensemble le modèle et la finition. 60 minutes max.' },
  { step: '02', icon: FileText, title: 'Soumission claire', desc: 'Un prix forfaitaire tout inclus, par écrit, dans les 24h. Aucune surprise. Valide 30 jours.' },
  { step: '03', icon: Handshake, title: 'Signature & dépôt', desc: 'Contrat signé, 50% à la commande. On commande les matériaux et on planifie le weekend.' },
  { step: '04', icon: Hammer, title: 'Exécution weekend', desc: 'Pose propre sur 1 à 2 weekends. Photos d\'avancement partagées. Chantier nettoyé chaque soir.' },
  { step: '05', icon: Truck, title: 'Livraison & solde', desc: 'Inspection avec vous, photos finales, guide d\'entretien remis. Solde de 50% à la livraison.' },
];

const GUARANTEES = [
  { icon: ShieldCheck, title: 'Garantie main-d\'œuvre 1 an', desc: 'Tout défaut d\'exécution est corrigé gratuitement dans les 12 mois suivant la livraison.' },
  { icon: Flame, title: 'Cheminée certifiée CSA', desc: 'Tous nos appareils sont homologués aux normes canadiennes de sécurité. Garantie fabricant incluse.' },
  { icon: FileCheck, title: 'Contrat écrit', desc: 'Prix fixe, délai fixe, inclusions détaillées. Aucune surprise après la signature.' },
  { icon: CreditCard, title: 'Paiement en 2 fois', desc: '50% au départ, 50% seulement quand vous êtes satisfait. Vous gardez le contrôle.' },
  { icon: Camera, title: 'Documentation complète', desc: 'Photos avant/pendant/après, guide d\'entretien remis à la livraison.' },
  { icon: Zap, title: 'Électricité conforme', desc: 'Tout câblage est exécuté par un électricien licencié. Conformité au Code du bâtiment du Québec.' },
];

export default function MursAccentPage() {
  const [openModel, setOpenModel] = useState(null);
  const SITE_URL = 'https://cmgeorges.ca/murs-accent';

  return (
    <div className="min-h-screen bg-[#0A0C14]" data-testid="murs-accent-page">
      <Helmet>
        <title>Murs Accent Cheminée & Télé sur mesure | Déco Touché — Rive-Sud Montréal</title>
        <meta name="description" content="Transformez votre salon en un weekend. Murs accent avec cheminée électrique, panneaux rainurés et intégration TV. Déco Touché, Rive-Sud de Montréal. À partir de 2 800$. Forfait tout inclus, garanti 1 an." />
        <meta name="keywords" content="mur cheminée électrique Montréal, mur TV salon Rive-Sud, panneaux rainurés installation, déco touché rénovation, homme à tout faire Longueuil, mur accent salon Brossard" />
        <meta property="og:title" content="Murs Accent Cheminée & Télé | Déco Touché" />
        <meta property="og:description" content="Salon transformé en un weekend. 4 modèles disponibles. À partir de 2 800$. Rive-Sud de Montréal." />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={SITE_URL} />
      </Helmet>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0A0C14] via-[#1B3A8C]/40 to-[#0A0C14] py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-y-0 right-0 w-1/2 hidden lg:block">
          <img src={HERO_IMG} alt="Mur accent salon avec cheminée et télé" className="w-full h-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0A0C14]/40 to-[#0A0C14]" />
        </div>
        <div className="container-main relative z-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/30 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="h-3.5 w-3.5" /> Déco Touché · Service Premium 2026
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 font-['Outfit'] leading-tight">
              Murs Accent<br />
              <span className="bg-gradient-to-r from-[#D4A017] to-[#F0C040] bg-clip-text text-transparent">Cheminée & Télé</span><br />
              sur mesure.
            </h1>
            <p className="text-white/75 text-base sm:text-lg mb-8 max-w-xl">
              Transformez votre salon en un seul weekend. Panneaux rainurés, pierre reconstituée, béton ciré — cheminée électrique certifiée CSA incluse. Clé en main, garanti 1 an.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
              <Stat icon={Home} value="4" label="Familles de modèles" />
              <Stat icon={Calendar} value="1–2" label="Weekends d'exécution" />
              <Stat icon={DollarSign} value="2 800$" label="À partir de" />
              <Stat icon={ShieldCheck} value="1 an" label="Garantie main-d'œuvre" />
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="#modeles">
                <Button className="bg-[#D4A017] hover:bg-[#b88a13] text-[#0A0C14] font-bold px-6 py-6 text-base" data-testid="murs-accent-cta-models">
                  Voir les modèles <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="#finitions">
                <Button variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/15 font-semibold px-6 py-6 text-base" data-testid="murs-accent-cta-catalog">
                  <BookOpen className="mr-2 h-4 w-4" /> Catalogue
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* MODÈLES */}
      <section id="modeles" className="py-20 bg-white">
        <div className="container-main">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0C14] mb-4 font-['Outfit']">Choisissez votre style</h2>
            <p className="text-gray-600">
              Quatre familles esthétiques adaptées à tous les intérieurs. Chaque forfait inclut matériaux, main-d&apos;œuvre et cheminée électrique. Cliquez pour voir ce qui est inclus.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {MODELS.map((m) => (
              <Card key={m.id} className={`overflow-hidden border-2 ${m.accent} hover:shadow-2xl transition-all hover:-translate-y-1 flex flex-col`} data-testid={`model-card-${m.id}`}>
                <div className="relative h-48 overflow-hidden">
                  <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                  <span className={`absolute top-3 left-3 px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full shadow-md ${m.badge.color}`}>
                    <Star className="inline h-3 w-3 mr-1" />{m.badge.label}
                  </span>
                </div>
                <CardContent className="p-5 flex-1 flex flex-col">
                  <span className="text-xs font-bold text-gray-500 tracking-wider">{m.code}</span>
                  <h3 className="text-xl font-bold text-[#0A0C14] mt-1 mb-3 font-['Outfit']">{m.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 flex-1">{m.desc}</p>
                  <div className="text-lg font-bold text-[#1B3A8C] mb-1">{m.price}</div>
                  <p className="text-xs text-gray-500 mb-3">{m.duration}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-700 mb-4">
                    <Calendar className="h-3 w-3" /> {m.solo}
                  </span>
                  <Button
                    onClick={() => setOpenModel(m)}
                    className={`w-full ${m.btnClass} font-semibold`}
                    data-testid={`model-included-btn-${m.id}`}
                  >
                    Ce qui est inclus <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FINITIONS */}
      <section id="finitions" className="py-20 bg-[#f7f5f0]">
        <div className="container-main">
          <div className="max-w-3xl mb-10">
            <span className="text-[#D4A017] font-semibold text-sm uppercase tracking-wider">Finitions disponibles</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0C14] mt-2 mb-3 font-['Outfit']">
              Un look unique pour votre espace
            </h2>
            <p className="text-gray-600">
              Chaque modèle est personnalisable selon vos goûts. Toutes les finitions sont incluses dans votre forfait — aucun supplément caché.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FINISHES.map((f) => (
              <div key={f.name} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow" data-testid={`finish-${f.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex">
                  <div className="w-24 h-24 flex-shrink-0">
                    <img src={f.img} alt={f.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 flex-1">
                    <h4 className="font-bold text-[#0A0C14] mb-1">{f.name}</h4>
                    <p className="text-xs text-gray-600 mb-2">{f.desc}</p>
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${f.model.startsWith('MOD') ? 'bg-[#1B3A8C] text-white' : 'bg-gray-200 text-gray-700'}`}>
                      {f.model.startsWith('MOD') ? `Inclus · ${f.model}` : f.model}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESSUS */}
      <section id="processus" className="py-20 bg-white">
        <div className="container-main">
          <div className="max-w-3xl mb-12">
            <span className="text-[#D4A017] font-semibold text-sm uppercase tracking-wider">Notre méthode</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0C14] mt-2 mb-3 font-['Outfit']">Simple, transparent, garanti</h2>
            <p className="text-gray-600">Cinq étapes claires du premier contact jusqu&apos;à la remise de votre mur transformé.</p>
          </div>
          <div className="space-y-4 max-w-3xl">
            {PROCESS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.step} className="flex items-start gap-4 p-5 rounded-xl bg-gray-50 hover:bg-[#f0f4ff] transition-colors border border-gray-200" data-testid={`process-step-${p.step}`}>
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1B3A8C] text-white flex items-center justify-center font-bold text-sm">
                    {p.step}
                  </div>
                  <Icon className="h-6 w-6 text-[#D4A017] flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-[#0A0C14] mb-1">{p.title}</h4>
                    <p className="text-sm text-gray-600">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GARANTIES */}
      <section id="garanties" className="py-20 bg-[#f7f5f0]">
        <div className="container-main">
          <div className="max-w-3xl mb-12">
            <span className="text-[#D4A017] font-semibold text-sm uppercase tracking-wider">Vos garanties</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0C14] mt-2 mb-3 font-['Outfit']">On s&apos;engage par écrit</h2>
            <p className="text-gray-600">Chaque projet Déco Touché est couvert par des garanties concrètes.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {GUARANTEES.map((g) => {
              const Icon = g.icon;
              return (
                <div key={g.title} className="bg-white rounded-xl p-5 border border-gray-200 hover:border-[#D4A017] hover:shadow-md transition-all" data-testid={`guarantee-${g.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                  <Icon className="h-8 w-8 text-[#1B3A8C] mb-3" />
                  <h4 className="font-bold text-[#0A0C14] mb-2">{g.title}</h4>
                  <p className="text-sm text-gray-600">{g.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="contact" className="py-20 bg-gradient-to-br from-[#1B3A8C] via-[#0A0C14] to-[#1B3A8C] relative overflow-hidden">
        <div className="container-main relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 font-['Outfit']">
              Votre mur rêvé,<br />
              <span className="text-[#D4A017]">livré ce weekend.</span>
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Envoyez-nous une photo de votre mur et le modèle qui vous inspire. Soumission gratuite en 24h. Rive-Sud de Montréal.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/soumission?service=murs-accent">
                <Button className="bg-[#D4A017] hover:bg-[#b88a13] text-[#0A0C14] font-bold px-8 py-6 text-base" data-testid="murs-accent-soumission-btn">
                  <Mail className="mr-2 h-4 w-4" /> Demander une soumission gratuite
                </Button>
              </Link>
              <a href="mailto:info@cmgeorges.ca">
                <Button variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/15 font-semibold px-6 py-6 text-base">
                  <Mail className="mr-2 h-4 w-4" /> info@cmgeorges.ca
                </Button>
              </a>
            </div>
            <p className="text-white/50 text-xs mt-8">
              Déco Touché · CMGeorges &middot; Rive-Sud de Montréal · NEQ 2280425325 · TPS 71476 7027 RT0001 · TVQ 4023795081 TQ0001
            </p>
          </div>
        </div>
      </section>

      {/* MODAL Inclusions */}
      <Dialog open={!!openModel} onOpenChange={() => setOpenModel(null)}>
        <DialogContent className="max-w-lg" data-testid="model-included-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#0A0C14] font-['Outfit']">
              {openModel?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {openModel?.code} · {openModel?.price}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 mt-2">
            {openModel?.included.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-[#1B3A8C] flex-shrink-0 mt-0.5" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
          <Link to="/soumission?service=murs-accent" className="mt-4 block">
            <Button className={`w-full ${openModel?.btnClass} font-semibold`}>
              Demander une soumission <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
      <Icon className="h-5 w-5 text-[#D4A017] flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-base sm:text-lg font-bold text-white truncate">{value}</div>
        <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider leading-tight">{label}</div>
      </div>
    </div>
  );
}
