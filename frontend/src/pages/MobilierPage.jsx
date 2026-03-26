import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sofa, 
  Truck, 
  Wrench, 
  Shield, 
  ArrowRight, 
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { publicApi } from '@/lib/api';

export default function MobilierPage() {
  const [processSteps, setProcessSteps] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stepsResponse, pricingResponse, faqsResponse] = await Promise.all([
          publicApi.getFurnitureProcessSteps(),
          publicApi.getFurniturePricing(),
          publicApi.getFAQs('Mobilier & Installation')
        ]);
        
        setProcessSteps(stepsResponse.data);
        setPricing(pricingResponse.data);
        setFaqs(faqsResponse.data);
      } catch (error) {
        console.error('Error fetching furniture data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'DollarSign':
        return DollarSign;
      case 'Truck':
        return Truck;
      case 'Wrench':
        return Wrench;
      default:
        return DollarSign;
    }
  };
  return (
    <div className="min-h-screen" data-testid="mobilier-page">
      {/* Hero */}
      <section className="relative min-h-[500px] flex items-center">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1920)'
          }}
        />
        <div className="absolute inset-0 bg-[#1a365d]/90" />
        <div className="container-main relative z-10 py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#E07A5F] text-white text-sm font-semibold rounded-full mb-6">
              <Sofa className="h-4 w-4" />
              NOUVEAU SERVICE
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 font-['Outfit']">
              Fourniture & Installation 
              <span className="text-[#d4af37]"> Mobilier</span>
            </h1>
            <p className="text-lg text-white/80 mb-8">
              Service clé en main: nous achetons, livrons, assemblons et installons 
              votre mobilier en toute sécurité. Prix transparents et compétitifs.
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
              Un processus simple en 3 étapes pour votre tranquillité d'esprit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {loading ? (
              // Loading skeleton for process steps
              Array.from({ length: 3 }).map((_, idx) => (
                <Card key={idx} className="text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-6 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded mb-3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </Card>
              ))
            ) : (
              processSteps.map((step, idx) => {
                const Icon = getIcon(step.icon);
                return (
                  <Card key={idx} className="text-center p-8 hover-lift" data-testid={`step-${idx}`}>
                    <div className="w-16 h-16 rounded-full bg-[#E07A5F]/10 flex items-center justify-center mx-auto mb-6">
                      <Icon className="h-8 w-8 text-[#E07A5F]" />
                    </div>
                    <span className="text-5xl font-bold text-[#1a365d]/10 font-['Outfit']">
                      {idx + 1}
                    </span>
                    <h3 className="text-xl font-semibold text-[#1a365d] mb-3 font-['Outfit'] -mt-4">
                      {step.title}
                    </h3>
                    <p className="text-gray-600">
                      {step.description}
                    </p>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Pricing Table */}
      <section className="section-spacing bg-[#F8FAFC]" data-testid="pricing-section">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
              Tarifs indicatifs
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Prix transparents. La soumission finale dépend de la complexité et des options choisies.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card className="overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="pricing-table">
                  <thead>
                    <tr className="bg-[#1a365d] text-white">
                      <th className="px-6 py-4 text-left font-semibold">Article</th>
                      <th className="px-6 py-4 text-center font-semibold">Prix assemblage</th>
                      <th className="px-6 py-4 text-center font-semibold">Temps estimé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      // Loading skeleton for pricing rows
                      Array.from({ length: 9 }).map((_, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="px-6 py-4 text-center"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="px-6 py-4 text-center"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                        </tr>
                      ))
                    ) : (
                      pricing.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 font-medium">{item.item_name}</td>
                          <td className="px-6 py-4 text-center text-[#1a365d] font-semibold">{item.base_price}$</td>
                          <td className="px-6 py-4 text-center text-gray-500">{item.time_estimate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-[#d4af37]/10 border-t">
                <p className="text-sm text-center text-gray-600">
                  <strong>Note:</strong> Livraison incluse à Montréal et Rive-Sud. 
                  Frais d'urgence (+20%) si service requis en moins de 48h.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-spacing bg-[#1a365d]" data-testid="benefits-section">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-8 font-['Outfit']">
                Pourquoi choisir notre service mobilier?
              </h2>
              <div className="space-y-6">
                {[
                  { icon: Shield, title: 'Ancrage sécuritaire', desc: 'Protection anti-basculement pour vos enfants.' },
                  { icon: Clock, title: 'Service rapide', desc: 'Disponibilité dans les 48-72h, ou service urgent disponible.' },
                  { icon: DollarSign, title: 'Prix compétitifs', desc: 'Comparatif prix marché fourni sur chaque soumission.' },
                  { icon: CheckCircle, title: 'Garantie travail', desc: 'Si ce n\'est pas parfait, on revient corriger gratuitement.' }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[#E07A5F] flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                        <p className="text-white/70 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <img 
                src="https://images.unsplash.com/photo-1770657986086-c1f20eef30ff?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
                alt="Assemblage professionnel"
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-spacing bg-white" data-testid="faq-section">
        <div className="container-main max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
              Questions fréquentes
            </h2>
          </div>

          <div className="space-y-4">
            {loading ? (
              // Loading skeleton for FAQs
              Array.from({ length: 4 }).map((_, idx) => (
                <Card key={idx} className="p-6">
                  <div className="h-5 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </Card>
              ))
            ) : (
              faqs.map((faq, idx) => (
                <Card key={idx} className="p-6" data-testid={`faq-${idx}`}>
                  <h3 className="font-semibold text-[#1a365d] mb-2">{faq.question}</h3>
                  <p className="text-gray-600 text-sm">{faq.answer}</p>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#E07A5F]">
        <div className="container-main text-center">
          <h2 className="text-3xl font-bold text-white mb-4 font-['Outfit']">
            Prêt à commander?
          </h2>
          <p className="text-white/90 mb-8 max-w-xl mx-auto">
            Obtenez une soumission gratuite incluant le comparatif prix marché vs CMGeorges.
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
