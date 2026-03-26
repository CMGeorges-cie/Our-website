import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, ArrowRight } from 'lucide-react';
import { publicApi } from '@/lib/api';

export default function GarantiePage() {
  const [guarantees, setGuarantees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGuarantees = async () => {
      try {
        const response = await publicApi.getGuarantees();
        setGuarantees(response.data);
      } catch (error) {
        console.error('Error fetching guarantees:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGuarantees();
  }, []);
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
            {loading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="bg-white rounded-xl p-8 shadow-sm">
                  <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center mb-6 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              guarantees.map((guarantee, idx) => (
                <div key={idx} className="bg-white rounded-xl p-8 shadow-sm" data-testid={`garantie-${guarantee.service_type}`}>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 ${
                    guarantee.service_type === 'manual' ? 'bg-[#1a365d]' :
                    guarantee.service_type === 'furniture' ? 'bg-[#E07A5F]' : 'bg-[#007AFF]'
                  }`}>
                    <span className="text-2xl">{guarantee.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1a365d] mb-4 font-['Outfit']">{guarantee.title}</h3>
                  <ul className="space-y-3">
                    {guarantee.features.map((feature, featureIdx) => (
                      <li key={featureIdx} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
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
