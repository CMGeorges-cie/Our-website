import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK } from '@/lib/utils';

export default function Footer() {
  return (
    <footer className="bg-[#1a365d] text-white no-print" data-testid="footer">
      <div className="container-main py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_cmgeorges-prod/artifacts/3w0w7gaw_logo_cmgeorges.svg" 
                alt="CMGeorges"
                className="h-12 w-auto"
              />
              <span className="font-bold text-xl font-['Outfit']">CMGeorges</span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed">
              Services professionnels de rénovation, installation mobilier et solutions tech pour Montréal et la Rive-Sud.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-[#d4af37] mb-4 font-['Outfit']">Services</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/services" className="text-white/70 hover:text-white transition-colors">
                  Déco Touché
                </Link>
              </li>
              <li>
                <Link to="/mobilier" className="text-white/70 hover:text-white transition-colors">
                  Mobilier & Installation
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-white/70 hover:text-white transition-colors">
                  CMGeorges Tech
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-[#d4af37] mb-4 font-['Outfit']">Liens rapides</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/portfolio" className="text-white/70 hover:text-white transition-colors">
                  Portfolio
                </Link>
              </li>
              <li>
                <Link to="/soumission" className="text-white/70 hover:text-white transition-colors">
                  Demander une soumission
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-white/70 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/garantie" className="text-white/70 hover:text-white transition-colors">
                  Garantie
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/70 hover:text-white transition-colors">
                  Nous contacter
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-[#d4af37] mb-4 font-['Outfit']">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a 
                  href={CMGEORGES_PHONE_LINK}
                  className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                  data-testid="footer-phone"
                >
                  <Phone className="h-4 w-4 text-[#d4af37]" />
                  {CMGEORGES_PHONE}
                </a>
              </li>
              <li>
                <a 
                  href="mailto:cmgeorges.cie@gmail.com"
                  className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4 text-[#d4af37]" />
                  cmgeorges.cie@gmail.com
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
              © {new Date().getFullYear()} CMGeorges. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-sm text-white/50">
              <Link to="/confidentialite" className="hover:text-white transition-colors">
                Confidentialité
              </Link>
              <Link to="/conditions" className="hover:text-white transition-colors">
                Conditions
              </Link>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-xs text-white/40">
            <span>TPS: 714767027 RT0001</span>
            <span>TVQ: 4023795081 TQ0001</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
