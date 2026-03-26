import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send
} from 'lucide-react';
import { publicApi } from '@/lib/api';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK } from '@/lib/utils';

const iconMap = {
  phone: Phone,
  email: Mail,
  location: MapPin,
  hours: Clock
};

export default function ContactPage() {
  usePageTitle('Contactez-nous');
  const [contactInfo, setContactInfo] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await publicApi.getContactInfo();
        setContactInfo(response.data);
      } catch (error) {
        console.error('Error fetching contact info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContactInfo();
  }, []);

  return (
    <div className="min-h-screen" data-testid="contact-page">
      {/* Header */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            Contactez-nous
          </h1>
          <p className="text-white/80 max-w-2xl">
            Une question? Un projet? N'hésitez pas à nous contacter,
            nous vous répondrons dans les plus brefs délais.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="section-spacing bg-[#F8FAFC]">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-8 font-['Outfit']">
                Nos coordonnées
              </h2>

              <div className="space-y-6">
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-6">
                      <div className="animate-pulse">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  contactInfo.map((info) => {
                    const IconComponent = iconMap[info.type];
                    return (
                      <Card key={info.id} className="p-6 hover-lift" data-testid={`contact-${info.type}`}>
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-[#1a365d] flex items-center justify-center flex-shrink-0">
                            {IconComponent && <IconComponent className="h-6 w-6 text-white" />}
                          </div>
                          <div>
                            <h3 className="font-semibold text-[#1a365d] mb-1">{info.title}</h3>
                            {info.value && (
                              <a
                                href={info.type === 'phone' ? CMGEORGES_PHONE_LINK : info.type === 'email' ? `mailto:${info.value}` : undefined}
                                className="text-lg text-[#d4af37] font-bold hover:underline"
                              >
                                {info.value}
                              </a>
                            )}
                            {info.subtitle && (
                              <p className="text-sm text-gray-500 mt-1">
                                {info.subtitle}
                              </p>
                            )}
                            {info.details && info.details.length > 0 && (
                              <div className="text-sm text-gray-700 mt-2 space-y-1">
                                {info.details.map((detail, idx) => (
                                  <p key={idx}>
                                    {detail.includes(':') ? (
                                      <>
                                        <strong>{detail.split(':')[0]}:</strong> {detail.split(':')[1]}
                                      </>
                                    ) : (
                                      detail
                                    )}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Quick CTA */}
              <div className="mt-8 p-6 bg-[#1a365d] rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Besoin d'une soumission?
                </h3>
                <p className="text-white/70 text-sm mb-4">
                  Remplissez notre formulaire de soumission pour recevoir un devis détaillé gratuit.
                </p>
                <Link to="/soumission">
                  <Button className="btn-accent w-full">
                    Demander une soumission
                  </Button>
                </Link>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <Card className="shadow-xl" data-testid="contact-form-card">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-[#1a365d] mb-6 font-['Outfit']">
                    Envoyez-nous un message
                  </h2>
                  
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group">
                        <Label htmlFor="name" className="form-label">Nom complet</Label>
                        <Input id="name" placeholder="Jean Tremblay" data-testid="contact-input-name" />
                      </div>
                      <div className="form-group">
                        <Label htmlFor="phone" className="form-label">Téléphone</Label>
                        <Input id="phone" type="tel" placeholder="514-555-1234" data-testid="contact-input-phone" />
                      </div>
                    </div>

                    <div className="form-group">
                      <Label htmlFor="email" className="form-label">Courriel</Label>
                      <Input id="email" type="email" placeholder="jean@example.com" data-testid="contact-input-email" />
                    </div>

                    <div className="form-group">
                      <Label htmlFor="subject" className="form-label">Sujet</Label>
                      <Input id="subject" placeholder="Question sur vos services" data-testid="contact-input-subject" />
                    </div>

                    <div className="form-group">
                      <Label htmlFor="message" className="form-label">Message</Label>
                      <Textarea 
                        id="message" 
                        rows={5} 
                        placeholder="Comment pouvons-nous vous aider?" 
                        data-testid="contact-input-message"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="btn-primary w-full" 
                      size="lg"
                      data-testid="contact-submit-btn"
                    >
                      <Send className="mr-2 h-5 w-5" />
                      Envoyer le message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
