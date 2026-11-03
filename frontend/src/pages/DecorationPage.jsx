import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  Bath,
  Frame,
  Flame,
  Layers,
  Leaf,
  Lightbulb,
  AppWindow,
  DoorOpen,
  Wrench,
  Image as ImageIcon,
  Ruler,
  Truck,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle,
  DollarSign
} from 'lucide-react';

const steps = [
  {
    icon: Ruler,
    title: 'Mesure & choix',
    description: 'Visite de mesure à 49 $ — 100 % déduite de ta commande. On choisit les produits ensemble, avec un aperçu de la composition avant la pose pour les murs-galeries.'
  },
  {
    icon: Truck,
    title: 'On commande, on livre',
    description: 'Commande chez nos fournisseurs professionnels et livraison coordonnée chez toi. Tu n\'achètes rien de ton côté.'
  },
  {
    icon: Sparkles,
    title: 'Installation professionnelle',
    description: 'Pose au niveau laser, ancrages inclus, finition soignée. Produits accrochés ou posés seulement — zéro travaux, zéro poussière.'
  }
];

const paniers = [
  {
    icon: Bath,
    image: '/images/deco/salle-de-bain-eclat.jpg',
    imageAlt: 'Salle de bain avec miroir LED rétroéclairé, meuble-lavabo marine et accents dorés',
    name: 'Salle de bain Éclat',
    price: '429 $',
    tagline: 'Le relooking de salle de bain en une visite, sans plombier ni électricien.',
    includes: [
      'Miroir LED anti-buée 32 × 24 po (à fiche)',
      'Ensemble d\'accessoires (porte-serviettes, tablette décorative, miroir d\'appoint)',
      'Pose complète incluse'
    ],
    why: 'Le miroir LED seul vaut environ 165 $ au détail. Ici, le produit, les accessoires ET l\'installation sont compris — un seul prix, une seule visite, zéro casse-tête.'
  },
  {
    icon: Frame,
    image: '/images/deco/mur-galerie-signature.jpg',
    imageAlt: 'Mur-galerie de six grands cadres dorés au-dessus d\'un divan, coussins marine et dorés',
    name: 'Mur-Galerie Signature',
    price: '549 $',
    tagline: 'Un mur designé, livré fini — pas juste « poser des cadres ».',
    includes: [
      '6 cadres galerie avec passe-partout (valeur au détail ~408 $)',
      'Impressions de TES photos incluses',
      'Composition dessinée sur mesure pour ton mur (aperçu avant la pose)',
      'Pose au niveau laser, ancrages inclus'
    ],
    why: 'Pourquoi 549 $? Les cadres à eux seuls valent ~408 $ au détail. Ajoute les impressions, le design de la composition et la pose professionnelle : tu n\'achètes rien d\'autre. Les encadreurs vendent les cadres; personne ne vient composer et poser la galerie chez toi. Nous, oui.'
  },
  {
    icon: Flame,
    image: '/images/deco/foyer-ambiance.jpg',
    imageAlt: 'Foyer électrique mural allumé sur un mur à lattes de bois, divan marine en face',
    name: 'Foyer Ambiance 50 po — vendu et installé',
    price: '1 599 $',
    tagline: 'Le look d\'un foyer de magazine, ce soir même.',
    includes: [
      'Foyer électrique Napoleon Entice 50 po (détail 1 199 $)',
      'Montage mural + finition + mise en service',
      'Se branche dans une prise ordinaire',
      'Environ 1 h 30, une seule visite'
    ],
    why: 'Le foyer seul se vend 1 199 $. Pour 400 $ de plus, tout est fait : livraison, montage mural, finition et mise en service. Aucun travaux, aucune cheminée à construire.'
  }
];

const produits = [
  {
    icon: Layers,
    name: 'Papier peint autocollant & murales',
    price: 'Mur accent 549–899 $ · Murale sur mesure 899–1 499 $',
    why: 'Posé par un pro : zéro bulle, raccords de motifs invisibles, coupes parfaites autour des prises. Se retire sans dommage — l\'argument parfait pour les locataires. Motifs fabriqués au Québec disponibles.'
  },
  {
    icon: Layers,
    image: '/images/deco/panneaux-lattes-tv.jpg',
    imageAlt: 'Mur de télé en panneaux acoustiques à lattes de chêne clair',
    name: 'Panneaux acoustiques à lattes de bois',
    price: 'Mur de télé (4–5 panneaux) 999–1 499 $ tout inclus',
    why: 'LE mur de télé du moment : coupes à la hauteur du plafond, pose au niveau, ancrage dans les montants. En prime, une vraie absorption acoustique (NRC 0,70). Panneaux vissés en accent, démontables.'
  },
  {
    icon: Leaf,
    name: 'Mur végétal artificiel',
    price: 'Panneau 349–549 $ · Mur complet 4 × 8 pi 1 299–2 499 $',
    why: 'L\'effet « resto/boutique » à la maison, zéro entretien. La composition (densité, mélange de feuillages) est un travail d\'artisan, et la fixation d\'un grand panneau doit être solide et parfaitement droite.'
  },
  {
    icon: Lightbulb,
    name: 'Appliques murales sans fil',
    price: 'Paire posée 349–549 $',
    why: 'Le look « appliques d\'hôtel » de chaque côté du lit ou du miroir — sans électricien, car les modèles sont rechargeables. Tu paies la symétrie parfaite au niveau laser et l\'appairage de la télécommande.'
  },
  {
    icon: AppWindow,
    name: 'Pellicule décorative pour vitres',
    price: '199–349 $ par surface · 449–799 $ pour 3–4 surfaces',
    why: 'Intimité de salle de bain, de porte d\'entrée ou de bureau sans changer la fenêtre — et c\'est réversible. Posée à la raclette par un pro, elle a l\'air d\'un verre givré d\'usine, sans bulles.'
  },
  {
    icon: DoorOpen,
    name: 'Garde-robe vendue + assemblée + ancrée',
    price: '1 499–2 999 $ selon configuration (systèmes IKEA PAX)',
    why: 'On fait déjà l\'assemblage — maintenant on vend le système complet : mesures, planification, commande, livraison, assemblage, ancrage anti-basculement et ajustement des portes. À Montréal, l\'assemblage seul d\'un PAX vaut déjà 350–900 $.'
  },
  {
    icon: Wrench,
    name: 'Relook quincaillerie coordonnée',
    price: 'Forfait 12–20 poignées + crochets 299–499 $',
    why: 'Changer toutes les poignées d\'une cuisine transforme le look pour une fraction d\'une rénovation. Alignement parfait au gabarit de perçage, un seul fini coordonné partout, en une visite.'
  },
  {
    icon: ImageIcon,
    name: 'Art grand format & toiles sur mesure',
    price: '599–999 $ livré + accroché',
    why: 'Une toile de 60 po et plus coûte cher, se transporte mal et exige un ancrage calculé selon le poids et les montants. On la livre et on l\'accroche droite et solide — pas dans trois mois, cette semaine.'
  }
];

const faqs = [
  {
    q: 'Je peux acheter mes produits moi-même?',
    a: 'Bien sûr! Apporte ton produit, on vient le poser : 149 $ la visite, 49 $ par item de plus posé le même jour. Et si tu préfères ne pas courir les magasins, on te fournit les produits aux mêmes prix qu\'en magasin — la pose est planifiée dès l\'achat.'
  },
  {
    q: 'La visite de mesure à 49 $, ça fonctionne comment?',
    a: 'Tu paies 49 $ pour la visite de mesure et le choix des produits. Si tu passes la commande, les 49 $ sont déduits à 100 % de ta facture. Zéro risque.'
  },
  {
    q: 'Comment je paie?',
    a: 'Un acompte seulement si on commande un produit sur mesure pour toi. Le reste, tu le paies quand le travail est fini et que tu as vu le résultat. Interac ou comptant, comme tu préfères.'
  },
  {
    q: 'Vous vous déplacez où?',
    a: 'Montréal et la Rive-Sud : Longueuil, Brossard, Saint-Lambert, Laval et les environs. Tu es un peu plus loin? Appelle-nous, on regarde ça ensemble.'
  },
  {
    q: 'Quels sont les délais?',
    a: 'Produits en stock : 3–7 jours. Produits sur mesure (stores, miroirs, murales) : 2–4 semaines selon le fournisseur. Et notre installation est garantie 90 jours.'
  }
];

export default function DecorationPage() {
  return (
    <div className="min-h-screen" data-testid="decoration-page">
      {/* Hero */}
      <section className="relative min-h-[500px] flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1920)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f38]/95 via-[#1a365d]/85 to-[#1a365d]/55" />
        <div className="container-main relative z-10 py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#E07A5F] text-white text-sm font-semibold rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              NOUVEAU SERVICE
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 font-['Outfit']">
              Décoration
              <span className="text-[#d4af37]"> vendue + installée</span>
            </h1>
            <p className="text-lg text-white/80 mb-8">
              Tu choisis tes produits, on s'occupe de tout : commande, livraison et
              installation professionnelle. Des produits accrochés ou posés, installés
              proprement — aucun gros travaux, aucune poussière de chantier.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/soumission">
                <Button className="btn-accent w-full sm:w-auto" size="lg">
                  Soumission gratuite
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="section-spacing bg-white" data-testid="process-section">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
              Comment ça marche?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Un processus simple en 3 étapes — et chaque prix s'explique. Pas de frais cachés.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <Card key={idx} className="text-center p-8 hover-lift" data-testid={`step-${idx}`}>
                  <div className="w-16 h-16 rounded-full bg-[#E07A5F]/10 flex items-center justify-center mx-auto mb-6">
                    <Icon className="h-8 w-8 text-[#E07A5F]" />
                  </div>
                  <span className="text-5xl font-bold text-white/10 font-['Outfit']">
                    {idx + 1}
                  </span>
                  <h3 className="text-xl font-semibold text-white mb-3 font-['Outfit'] -mt-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-300">
                    {step.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grille d'installation */}
      <section className="section-spacing bg-[#F8FAFC]" data-testid="install-grid-section">
        <div className="container-main">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
              L'installation, à la carte
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Tu as déjà ton produit? On vient le poser. La grille est la même pour tous les produits déco.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center p-8">
              <DollarSign className="h-8 w-8 text-[#d4af37] mx-auto mb-4" />
              <p className="text-4xl font-bold text-[#d4af37] font-['Outfit'] mb-2">149 $</p>
              <h3 className="font-semibold text-white mb-2">Visite d'installation</h3>
              <p className="text-gray-300 text-sm">Premier item posé, déplacement inclus à Montréal et sur la Rive-Sud.</p>
            </Card>
            <Card className="text-center p-8">
              <DollarSign className="h-8 w-8 text-[#d4af37] mx-auto mb-4" />
              <p className="text-4xl font-bold text-[#d4af37] font-['Outfit'] mb-2">49 $</p>
              <h3 className="font-semibold text-white mb-2">Par item additionnel</h3>
              <p className="text-gray-300 text-sm">Chaque produit de plus posé pendant la même visite. Rentable dès le 2e item.</p>
            </Card>
            <Card className="text-center p-8">
              <Ruler className="h-8 w-8 text-[#d4af37] mx-auto mb-4" />
              <p className="text-4xl font-bold text-[#d4af37] font-['Outfit'] mb-2">49 $</p>
              <h3 className="font-semibold text-white mb-2">Visite de mesure</h3>
              <p className="text-gray-300 text-sm">Pour le sur-mesure (stores, miroirs, murales). <strong>100 % déduite</strong> de ta commande.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Paniers vedettes */}
      <section className="section-spacing bg-white" data-testid="paniers-section">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
              Les paniers vedettes — tout inclus
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Produit + installation dans un seul prix. Et on t'explique exactement ce que le prix contient.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {paniers.map((panier, idx) => {
              const Icon = panier.icon;
              return (
                <Card key={idx} className="p-8 hover-lift flex flex-col" data-testid={`panier-${idx}`}>
                  <img
                    src={panier.image}
                    alt={panier.imageAlt}
                    loading="lazy"
                    className="w-full h-52 object-cover rounded-xl mb-6 ring-1 ring-[#d4af37]/30"
                  />
                  <div className="w-14 h-14 rounded-full bg-[#d4af37]/10 flex items-center justify-center mb-6">
                    <Icon className="h-7 w-7 text-[#d4af37]" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-1 font-['Outfit']">
                    {panier.name}
                  </h3>
                  <p className="text-4xl font-bold text-[#d4af37] font-['Outfit'] mb-3">
                    {panier.price}
                    <span className="text-base font-normal text-gray-300"> tout inclus</span>
                  </p>
                  <p className="text-gray-300 italic mb-5">{panier.tagline}</p>
                  <ul className="space-y-2 mb-6">
                    {panier.includes.map((item, j) => (
                      <li key={j} className="flex gap-2 text-sm text-gray-200">
                        <CheckCircle className="h-4 w-4 text-[#d4af37] flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-gray-600 bg-[#F8FAFC] rounded-lg p-4 mt-auto">
                    {panier.why}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Produits expansion */}
      <section className="section-spacing bg-[#1a365d]" data-testid="produits-section">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 font-['Outfit']">
              Encore plus de murs signature
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Vendus et installés par Déco Touché. Chaque prix inclut le produit, la livraison coordonnée et la pose.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {produits.map((produit, idx) => {
              const Icon = produit.icon;
              return (
                <Card key={idx} className="p-8" data-testid={`produit-${idx}`}>
                  {produit.image && (
                    <img
                      src={produit.image}
                      alt={produit.imageAlt}
                      loading="lazy"
                      className="w-full h-56 object-cover rounded-xl mb-6 ring-1 ring-white/15"
                    />
                  )}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#E07A5F] flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1 font-['Outfit']">{produit.name}</h3>
                      <p className="text-[#d4af37] font-bold mb-3">{produit.price}</p>
                      <p className="text-gray-300 text-sm">{produit.why}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 text-white">
            {[
              { icon: Shield, title: 'Zéro travaux', desc: 'Produits accrochés ou posés, démontables sans traces. Parfait pour les propriétaires comme pour les locataires — et on repart en laissant la place propre.' },
              { icon: Clock, title: 'Délais honnêtes', desc: 'En stock : 3–7 jours. Sur mesure : 2–4 semaines. On te confirme le délai avant que tu paies quoi que ce soit.' },
              { icon: CheckCircle, title: 'Garanties', desc: 'Installation garantie 90 jours. Produits vendus couverts par la garantie légale du Québec.' }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#d4af37] flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-[#1a365d]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                    <p className="text-white/70 text-sm">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* À la carte */}
      <section className="section-spacing bg-white" data-testid="alacarte-section">
        <div className="container-main">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
              Aussi à la carte
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Prix des produits seuls — l'installation suit la grille ci-dessus (149 $ la visite + 49 $ par item additionnel).
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8">
              <h3 className="text-lg font-semibold text-white mb-4 font-['Outfit']">Miroirs & LED</h3>
              <ul className="space-y-3 text-sm text-gray-200">
                <li className="flex justify-between gap-4"><span>Miroir LED rond 28 po, anti-buée (à fiche)</span><strong>164 $</strong></li>
                <li className="flex justify-between gap-4"><span>Miroir LED rectangulaire 32 × 24 po, anti-buée</span><strong>163 $</strong></li>
                <li className="flex justify-between gap-4"><span>Miroir LED certifié UL 40 × 30 po, garantie 3 ans</span><strong>360 $</strong></li>
                <li className="flex justify-between gap-4"><span>Miroir LED grand format 60 × 40 po, verre trempé</span><strong>480 $</strong></li>
                <li className="flex justify-between gap-4"><span>Miroir pleine longueur arqué 71 × 27 po</span><strong>dès 149 $</strong></li>
                <li className="flex justify-between gap-4"><span>Miroir décoratif feuille d'or, fini main, 39,5 po</span><strong>500 $</strong></li>
                <li className="flex justify-between gap-4"><span><strong>Miroir sur mesure</strong> avec moulure (vitrerie locale)</span><strong>450–700 $ installé</strong></li>
              </ul>
              <p className="text-xs text-gray-400 mt-4">Pourquoi ces prix : ce sont les prix de détail publics des mêmes modèles — chez nous, la pose est planifiée dès l'achat et la mesure est déduite.</p>
            </Card>
            <Card className="p-8">
              <h3 className="text-lg font-semibold text-white mb-4 font-['Outfit']">Stores & rideaux</h3>
              <ul className="space-y-3 text-sm text-gray-200">
                <li className="flex justify-between gap-4"><span>Store enrouleur prêt-à-poser</span><strong>~72 $/fenêtre</strong></li>
                <li className="flex justify-between gap-4"><span>Pose de store</span><strong>50–100 $/fenêtre</strong></li>
                <li className="flex justify-between gap-4"><span>Tringle décorative + 2 panneaux de rideaux</span><strong>100–160 $</strong></li>
                <li className="flex justify-between gap-4"><span>Stores motorisés sur mesure</span><strong>~380 $/fenêtre installé</strong></li>
                <li className="flex justify-between gap-4"><span>Persiennes sur mesure</span><strong>~471 $/fenêtre installé</strong></li>
                <li className="flex justify-between gap-4"><span><strong>Stores sur mesure</strong> (fabricant québécois)</span><strong>sur soumission</strong></li>
              </ul>
              <p className="text-xs text-gray-400 mt-4">Un repère : une maison type de 7 fenêtres en sur mesure tourne autour de 2 000 $ (produits + installation), mesure de 49 $ déduite.</p>
            </Card>
            <Card className="p-8">
              <h3 className="text-lg font-semibold text-white mb-4 font-['Outfit']">Foyers électriques (à fiche)</h3>
              <ul className="space-y-3 text-sm text-gray-200">
                <li className="flex justify-between gap-4"><span>Napoleon Entice 50 po</span><strong>1 199 $</strong></li>
                <li className="flex justify-between gap-4"><span>Dimplex Prism 50 po</span><strong>2 088 $</strong></li>
                <li className="flex justify-between gap-4"><span>Napoleon Astound / Trivista 50 po</span><strong>2 399 $</strong></li>
              </ul>
              <p className="text-xs text-gray-400 mt-4">Modèles muraux ou autoportants branchables seulement — les modèles encastrés (« built-in ») ne font pas partie de l'offre. Voir le panier Foyer Ambiance pour le tout-inclus.</p>
            </Card>
          </div>
          <p className="text-sm text-center text-gray-600 mt-8 max-w-3xl mx-auto">
            <strong>Transparence :</strong> prix en $ CAD avant taxes, basés sur les prix de détail publics vérifiés (Home Depot Canada, Wayfair Canada, Bouclair, vitreries locales). Acompte sur les produits avant toute commande sur mesure.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-spacing bg-[#F8FAFC]" data-testid="faq-section">
        <div className="container-main max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
              Questions fréquentes
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="p-6" data-testid={`faq-${idx}`}>
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-gray-300 text-sm">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#E07A5F]">
        <div className="container-main text-center">
          <h2 className="text-3xl font-bold text-white mb-4 font-['Outfit']">
            Un mur vide qui t'énerve?
          </h2>
          <p className="text-white/90 mb-8 max-w-xl mx-auto">
            Commence par la visite de mesure à 49 $ — déduite à 100 % si tu commandes. Tu repars avec un plan et des prix fermes.
          </p>
          <Link to="/soumission">
            <Button size="lg" className="bg-white text-[#E07A5F] hover:bg-white/90">
              Demander une soumission
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
