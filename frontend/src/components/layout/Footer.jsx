import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Shield, Instagram, Facebook } from 'lucide-react';
import { DECOTOUCHE_LOGO_URL } from '@/lib/utils';
import { BRAND } from '@/config/brand';
import { useSiteSettings } from '@/lib/publicData';

export default function Footer() {
  const trust = useSiteSettings()?.trust;
  return (
    <footer className="bg-[#1a365d] text-white no-print" data-testid="footer">
      <div className="container-main py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img 
                src={DECOTOUCHE_LOGO_URL} 
                alt="Déco Touché"
                className="h-12 w-auto"
              />
              <span className="font-bold text-xl font-['Outfit']">Déco Touché</span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed">
              Peinture intérieure et extérieure, rénovation légère et entretien général. Service professionnel pour Montréal et la Rive-Sud.
            </p>
            {trust?.insured && (
              <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10" data-testid="footer-insurance">
                <div className="flex items-center gap-2 text-[#d4af37] text-xs font-semibold mb-1">
                  <Shield className="h-3 w-3" /> PROFESSIONNEL & ASSURÉ
                </div>
                {trust.insurance_text && <p className="text-white/60 text-xs">{trust.insurance_text}</p>}
                <p className="text-white/60 text-xs">Service professionnel garanti</p>
              </div>
            )}
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-[#d4af37] mb-4 font-['Outfit']">Nos Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/services/peinture" className="text-white/70 hover:text-white transition-colors">Peinture intérieure/extérieure</Link></li>
              <li><Link to="/murs-accent" className="text-white/70 hover:text-white transition-colors">Murs Accent (Cheminée & TV)</Link></li>
              <li><Link to="/services/renovation" className="text-white/70 hover:text-white transition-colors">Rénovation légère</Link></li>
              <li><Link to="/services/entretien" className="text-white/70 hover:text-white transition-colors">Entretien général</Link></li>
              <li><Link to="/services/mobilier" className="text-white/70 hover:text-white transition-colors">Installation de mobilier</Link></li>
              <li><Link to="/services/demolition" className="text-white/70 hover:text-white transition-colors">Démolition</Link></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-[#d4af37] mb-4 font-['Outfit']">Liens rapides</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/portfolio" className="text-white/70 hover:text-white transition-colors">Portfolio</Link></li>
              <li><Link to="/soumission" className="text-white/70 hover:text-white transition-colors">Demander une soumission</Link></li>
              <li><Link to="/faq" className="text-white/70 hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/garantie" className="text-white/70 hover:text-white transition-colors">Garantie</Link></li>
              <li><Link to="/blog" className="text-white/70 hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/connexion" className="text-white/70 hover:text-white transition-colors">Portail client</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-[#d4af37] mb-4 font-['Outfit']">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href={BRAND.phone.link} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors" data-testid="footer-phone">
                  <Phone className="h-4 w-4 text-[#d4af37]" />
                  {BRAND.phone.display}
                </a>
              </li>
              <li>
                <a href={`mailto:${BRAND.email}`} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                  <Mail className="h-4 w-4 text-[#d4af37]" />
                  {BRAND.email}
                </a>
              </li>
              <li className="flex items-start gap-2 text-white/70">
                <MapPin className="h-4 w-4 text-[#d4af37] mt-0.5 flex-shrink-0" />
                <span>{BRAND.address}</span>
              </li>
            </ul>
            {/* Social icons */}
            {(BRAND.social.instagram || BRAND.social.facebook) && (
              <div className="flex items-center gap-3 mt-4" data-testid="footer-socials">
                {BRAND.social.instagram && (
                  <a
                    href={BRAND.social.instagram}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    data-testid="footer-instagram"
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#d4af37] hover:text-[#1a365d] text-white/80 flex items-center justify-center transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {BRAND.social.facebook && (
                  <a
                    href={BRAND.social.facebook}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    data-testid="footer-facebook"
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#d4af37] hover:text-[#1a365d] text-white/80 flex items-center justify-center transition-colors"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <p className="text-white/50 text-sm">
              &copy; {new Date().getFullYear()} {BRAND.legalName}. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-sm text-white/50">
              <Link to="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
              <Link to="/conditions" className="hover:text-white transition-colors">Conditions</Link>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-6 text-xs text-white/40 text-center" data-testid="footer-tax-numbers">
            <span>TPS&nbsp;: {BRAND.taxes.gst}</span>
            <span>TVQ&nbsp;: {BRAND.taxes.qst}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
