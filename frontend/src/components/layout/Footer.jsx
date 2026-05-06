import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Shield } from 'lucide-react';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK, DECOTOUCHE_LOGO_URL } from '@/lib/utils';

export default function Footer() {
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
            <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 text-[#d4af37] text-xs font-semibold mb-1">
                <Shield className="h-3 w-3" /> PROFESSIONNEL & ASSURÉ
              </div>
              <p className="text-white/60 text-xs">Assurance responsabilité civile active</p>
              <p className="text-white/60 text-xs">Service professionnel garanti</p>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-[#d4af37] mb-4 font-['Outfit']">Nos Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/services/peinture" className="text-white/70 hover:text-white transition-colors">Peinture intérieure/extérieure</Link></li>
              <li><Link to="/services/renovation" className="text-white/70 hover:text-white transition-colors">Rénovation légère</Link></li>
              <li><Link to="/services/entretien" className="text-white/70 hover:text-white transition-colors">Entretien général</Link></li>
              <li><Link to="/services/mobilier" className="text-white/70 hover:text-white transition-colors">Installation de mobilier</Link></li>
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
                <a href={CMGEORGES_PHONE_LINK} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors" data-testid="footer-phone">
                  <Phone className="h-4 w-4 text-[#d4af37]" />
                  {CMGEORGES_PHONE}
                </a>
              </li>
              <li>
                <a href="mailto:info@decotouche.ca" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                  <Mail className="h-4 w-4 text-[#d4af37]" />
                  info@decotouche.ca
                </a>
              </li>
              <li className="flex items-start gap-2 text-white/70">
                <MapPin className="h-4 w-4 text-[#d4af37] mt-0.5 flex-shrink-0" />
                <span>Montréal & Rive-Sud, QC</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <p className="text-white/50 text-sm">
              &copy; {new Date().getFullYear()} Déco Touché. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-sm text-white/50">
              <Link to="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
              <Link to="/conditions" className="hover:text-white transition-colors">Conditions</Link>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-6 text-xs text-white/40 text-center" data-testid="footer-tax-numbers">
            <span>TPS&nbsp;: 714767027RT0001</span>
            <span>TVQ&nbsp;: 4023795081TQ0001</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
