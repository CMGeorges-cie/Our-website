import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  Send
} from 'lucide-react';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK } from '@/lib/utils';

export default function ContactPage() {
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
                <Card className="p-6 hover-lift" data-testid="contact-phone">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#1a365d] flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1a365d] mb-1">Téléphone</h3>
                      <a 
                        href={CMGEORGES_PHONE_LINK}
                        className="text-lg text-[#d4af37] font-bold hover:underline"
                      >
                        {CMGEORGES_PHONE}
                      </a>
                      <p className="text-sm text-gray-500 mt-1">
                        Disponible 7j/7, 8h à 20h
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 hover-lift" data-testid="contact-email">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#1a365d] flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1a365d] mb-1">Courriel</h3>
                      <a 
                        href="mailto:info@decotouche.ca"
                        className="text-lg text-[#d4af37] font-bold hover:underline"
                      >
                        info@decotouche.ca
                      </a>
                      <p className="text-sm text-gray-500 mt-1">
                        Réponse sous 24h
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 hover-lift" data-testid="contact-location">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#1a365d] flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1a365d] mb-1">Zone de service</h3>
                      <p className="text-lg text-gray-700">
                        Montréal & Rive-Sud
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Longueuil, Brossard, Saint-Hubert, Laval...
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 hover-lift" data-testid="contact-hours">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#1a365d] flex items-center justify-center flex-shrink-0">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1a365d] mb-1">Heures d'ouverture</h3>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p><strong>Lun-Ven:</strong> 8h - 20h</p>
                        <p><strong>Sam-Dim:</strong> 9h - 18h</p>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Service d'urgence disponible
                      </p>
                    </div>
                  </div>
                </Card>
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
