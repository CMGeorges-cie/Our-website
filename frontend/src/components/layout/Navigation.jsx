import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, LogIn, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Accueil' },
  { href: '/services', label: 'Services' },
  { href: '/mobilier', label: 'Mobilier' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="nav-glass sticky top-0 z-50 no-print" data-testid="main-navigation">
      <div className="container-main">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
            <img 
              src="https://customer-assets.emergentagent.com/job_cmgeorges-prod/artifacts/3w0w7gaw_logo_cmgeorges.svg" 
              alt="CMGeorges"
              className="h-12 w-auto"
            />
            <span className="font-bold text-xl text-[#1a365d] hidden sm:block font-['Outfit']">
              CMGeorges
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-[#d4af37] ${
                  location.pathname === link.href 
                    ? 'text-[#1a365d] font-semibold' 
                    : 'text-gray-600'
                }`}
                data-testid={`nav-link-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
            {/* ServiceFlow Link - Highlighted */}
            <Link
              to="/serviceflow"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-1.5 rounded-full ${
                location.pathname.startsWith('/serviceflow')
                  ? 'bg-[#1a365d] text-white'
                  : 'bg-[#1a365d]/5 text-[#1a365d] hover:bg-[#1a365d]/10'
              }`}
              data-testid="nav-link-serviceflow"
            >
              <Zap className="w-3.5 h-3.5" />
              ServiceFlow
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <a 
              href={CMGEORGES_PHONE_LINK}
              className="flex items-center gap-2 text-[#1a365d] hover:text-[#d4af37] transition-colors"
              data-testid="nav-phone"
            >
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">{CMGEORGES_PHONE}</span>
            </a>
            <Link to="/connexion" data-testid="nav-login-btn">
              <Button variant="outline" size="sm" className="border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white">
                <LogIn className="h-4 w-4 mr-1.5" />
                Connexion
              </Button>
            </Link>
            <Link to="/soumission">
              <Button 
                className="btn-accent"
                size="sm"
                data-testid="nav-soumission-btn"
              >
                Soumission gratuite
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            data-testid="mobile-menu-toggle"
          >
            {isOpen ? (
              <X className="h-6 w-6 text-[#1a365d]" />
            ) : (
              <Menu className="h-6 w-6 text-[#1a365d]" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-gray-100 animate-fade-in" data-testid="mobile-menu">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.href
                      ? 'bg-[#1a365d]/10 text-[#1a365d]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsOpen(false)}
                  data-testid={`mobile-nav-link-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Link>
              ))}
              {/* ServiceFlow - Mobile */}
              <Link
                to="/serviceflow"
                className="px-4 py-3 rounded-lg text-sm font-medium bg-[#1a365d]/5 text-[#1a365d] flex items-center gap-2"
                onClick={() => setIsOpen(false)}
              >
                <Zap className="w-4 h-4" />
                ServiceFlow
                <span className="text-xs bg-[#d4af37] text-[#1a365d] px-2 py-0.5 rounded-full ml-auto">CRM</span>
              </Link>
              
              <div className="border-t border-gray-100 mt-2 pt-2">
                <Link
                  to="/connexion"
                  className="mx-4 mt-2 block"
                  onClick={() => setIsOpen(false)}
                >
                  <Button variant="outline" className="w-full border-[#1a365d] text-[#1a365d]" data-testid="mobile-login-btn">
                    <LogIn className="h-4 w-4 mr-2" />
                    Connexion
                  </Button>
                </Link>
                <Link
                  to="/soumission"
                  className="mx-4 mt-2 block"
                  onClick={() => setIsOpen(false)}
                >
                  <Button className="btn-accent w-full" data-testid="mobile-soumission-btn">
                    Soumission gratuite
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
