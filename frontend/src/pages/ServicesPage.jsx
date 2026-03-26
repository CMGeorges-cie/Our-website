import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useTranslation } from 'react-i18next';
import { publicApi } from '@/lib/api';
import {
  Paintbrush,
  Sofa,
  Code,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function ServicesPage() {
  const { t } = useTranslation();
  usePageTitle(`${t('services.title')} - CMGeorges`);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await publicApi.getServices();
        setServices(response.data);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const getServiceIcon = (serviceName) => {
    switch (serviceName) {
      case 'deco-touche':
        return Paintbrush;
      case 'mobilier':
        return Sofa;
      case 'tech-services':
        return Code;
      default:
        return Paintbrush;
    }
  };

  const getServiceColor = (serviceName) => {
    switch (serviceName) {
      case 'deco-touche':
        return 'bg-[#1a365d]';
      case 'mobilier':
        return 'bg-[#E07A5F]';
      case 'tech-services':
        return 'bg-[#007AFF]';
      default:
        return 'bg-[#1a365d]';
    }
  };

  const getServiceSubtitle = (serviceName) => {
    switch (serviceName) {
      case 'deco-touche':
        return 'Peinture & Rénovation';
      case 'mobilier':
        return 'Service clé en main';
      case 'tech-services':
        return 'Solutions Numériques';
      default:
        return '';
    }
  };

  const getServicePricing = (serviceName) => {
    switch (serviceName) {
      case 'deco-touche':
        return 'À partir de 250$';
      case 'mobilier':
        return 'À partir de 75$/meuble';
      case 'tech-services':
        return 'Sur devis';
      default:
        return 'Sur devis';
    }
  };

  return (
    <div className="min-h-screen" data-testid="services-page">
      {/* Header */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            {t('services.title')}
          </h1>
          <p className="text-white/80 max-w-2xl">
            Trois divisions d'expertise pour répondre à tous vos besoins,
            de la rénovation au numérique.
          </p>
        </div>
      </section>

      {/* Services List */}
      <section className="section-spacing bg-[#F8FAFC]">
        <div className="container-main space-y-24">
          {loading ? (
            // Loading state
            [1, 2, 3].map((index) => {
              const isReversed = index % 2 === 1;
              return (
                <div
                  key={index}
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${isReversed ? 'lg:flex-row-reverse' : ''}`}
                >
                  <div className={isReversed ? 'lg:order-2' : ''}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-200 text-sm font-medium mb-4 animate-pulse">
                      <div className="h-4 w-4 bg-gray-300 rounded" />
                      <div className="h-4 bg-gray-300 rounded w-32" />
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-64 mb-4 animate-pulse" />
                    <div className="space-y-2 mb-6">
                      <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex items-center gap-2 animate-pulse">
                          <div className="h-5 w-5 bg-gray-200 rounded" />
                          <div className="h-4 bg-gray-200 rounded w-32" />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-6">
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-16 mb-1 animate-pulse" />
                        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
                      </div>
                      <div className="h-12 bg-gray-200 rounded w-40 animate-pulse" />
                    </div>
                  </div>

                  <div className={isReversed ? 'lg:order-1' : ''}>
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                      <div className="w-full h-[400px] bg-gray-200 animate-pulse" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            services.map((service, index) => {
              const Icon = getServiceIcon(service.name);
              const color = getServiceColor(service.name);
              const subtitle = getServiceSubtitle(service.name);
              const pricing = getServicePricing(service.name);
              const isReversed = index % 2 === 1;

              return (
                <div
                  key={service.id}
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${isReversed ? 'lg:flex-row-reverse' : ''}`}
                  data-testid={`service-detail-${service.name}`}
                >
                  <div className={isReversed ? 'lg:order-2' : ''}>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${color} text-white text-sm font-medium mb-4`}>
                      <Icon className="h-4 w-4" />
                      {subtitle}
                    </div>
                    <h2 className="text-3xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
                      {service.title}
                    </h2>
                    <p className="text-gray-600 mb-6 text-lg">
                      {service.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-[#d4af37] flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-sm text-gray-500">À partir de</span>
                        <p className="text-2xl font-bold text-[#1a365d] font-['Outfit']">
                          {pricing}
                        </p>
                      </div>
                      <Link to="/soumission">
                        <Button className="btn-accent">
                          Demander un devis
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className={isReversed ? 'lg:order-1' : ''}>
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                      <img
                        src={service.image_url}
                        alt={service.title}
                        className="w-full h-[400px] object-cover"
                      />
                      {service.is_featured && (
                        <div className="absolute top-4 right-4 px-4 py-2 bg-[#d4af37] text-[#1a365d] font-bold rounded-full text-sm">
                          NOUVEAU
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#1a365d]">
        <div className="container-main text-center">
          <h2 className="text-3xl font-bold text-white mb-4 font-['Outfit']">
            Un projet en tête?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Contactez-nous pour une soumission gratuite et sans engagement.
          </p>
          <Link to="/soumission">
            <Button size="lg" className="btn-accent">
              Obtenir une soumission
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
