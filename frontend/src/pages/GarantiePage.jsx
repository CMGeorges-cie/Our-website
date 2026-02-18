import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, ArrowRight } from 'lucide-react';

export default function GarantiePage() {
  return (
    <div className="min-h-screen" data-testid="garantie-page">
      <Helmet>
        <title>Garantie de Service | CMGeorges Montréal</title>
        <meta name="description" content="Découvrez notre garantie de satisfaction sur tous nos services de peinture, assemblage mobilier et développement web à Montréal." />
      </Helmet>

      {/* Header */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main">
          <div className="flex items-center gap-4 mb-4">
            <Shield className="h-12 w-12 text-[#d4af37]" />
            <h1 className="text-3xl md:text-4xl font-bold text-white font-['Outfit']">
              Notre Garantie
            </h1>
          </div>
          <p className="text-white/80 max-w-2xl">
            Votre satisfaction est notre priorité. Découvrez nos engagements de qualité.
          </p>
        </div>
      </section>

      {/* Main Guarantee */}
      <section className="py-16 bg-white">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#d4af37]/10 mb-8">
              <CheckCircle className="h-12 w-12 text-[#d4af37]" />
            </div>
            <h2 className="text-3xl font-bold text-[#1a365d] mb-6 font-['Outfit']">
              Garantie Satisfaction 100%
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Si vous n'êtes pas satisfait de notre travail, nous revenons corriger 
              gratuitement — sans question. C'est notre engagement envers vous.
            </p>
          </div>
        </div>
      </section>

      {/* Service-Specific Guarantees */}
      <section className="section-spacing bg-[#F8FAFC]">
        <div className="container-main">
          <h2 className="text-2xl font-bold text-[#1a365d] mb-12 text-center font-['Outfit']">
            Garanties par Service
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Déco Touché */}
            <div className="bg-white rounded-xl p-8 shadow-sm" data-testid="garantie-manual">
              <div className="w-12 h-12 rounded-lg bg-[#1a365d] flex items-center justify-center mb-6">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-bold text-[#1a365d] mb-4 font-['Outfit']">Déco Touché</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Garantie 1 an sur la main-d'œuvre</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Correction gratuite sous 30 jours</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Protection des surfaces et meubles</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Nettoyage complet après travaux</span>
                </li>
              </ul>
            </div>

            {/* Mobilier */}
            <div className="bg-white rounded-xl p-8 shadow-sm" data-testid="garantie-furniture">
              <div className="w-12 h-12 rounded-lg bg-[#E07A5F] flex items-center justify-center mb-6">
                <span className="text-2xl">🛋️</span>
              </div>
              <h3 className="text-xl font-bold text-[#1a365d] mb-4 font-['Outfit']">Mobilier</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Garantie 30 jours sur l'assemblage</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Ancrage mural sécuritaire certifié</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Remplacement pièces endommagées pendant l'installation</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Récupération des emballages incluse</span>
                </li>
              </ul>
            </div>

            {/* Tech */}
            <div className="bg-white rounded-xl p-8 shadow-sm" data-testid="garantie-tech">
              <div className="w-12 h-12 rounded-lg bg-[#007AFF] flex items-center justify-center mb-6">
                <span className="text-2xl">💻</span>
              </div>
              <h3 className="text-xl font-bold text-[#1a365d] mb-4 font-['Outfit']">CMGeorges Tech</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Garantie 90 jours sur les bugs</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Support technique inclus</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Code source fourni et documenté</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Formation sur l'utilisation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 bg-white">
        <div className="container-main max-w-3xl">
          <h2 className="text-2xl font-bold text-[#1a365d] mb-8 text-center font-['Outfit']">
            Comment fonctionne notre garantie?
          </h2>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#1a365d] flex items-center justify-center text-white font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-[#1a365d] mb-1">Signalez le problème</h3>
                <p className="text-gray-600 text-sm">
                  Contactez-nous par téléphone, courriel ou via notre site pour décrire le problème.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#1a365d] flex items-center justify-center text-white font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-[#1a365d] mb-1">Évaluation rapide</h3>
                <p className="text-gray-600 text-sm">
                  Nous évaluons la situation et planifions une intervention dans les 48-72h.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#d4af37] flex items-center justify-center text-[#1a365d] font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-[#1a365d] mb-1">Correction gratuite</h3>
                <p className="text-gray-600 text-sm">
                  Nous corrigeons le problème sans frais additionnels, jusqu'à votre satisfaction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#1a365d]">
        <div className="container-main text-center">
          <h2 className="text-3xl font-bold text-white mb-4 font-['Outfit']">
            Prêt à travailler avec nous?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Faites confiance à une équipe qui garantit son travail.
          </p>
          <Link to="/soumission">
            <Button size="lg" className="btn-accent">
              Demander une soumission gratuite
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
