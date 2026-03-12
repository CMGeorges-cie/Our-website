import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, LogIn } from 'lucide-react';
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
          <div className="hidden md:flex items-center gap-8">
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
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <a 
              href={CMGEORGES_PHONE_LINK}
              className="flex items-center gap-2 text-[#1a365d] hover:text-[#d4af37] transition-colors"
              data-testid="nav-phone"
            >
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">{CMGEORGES_PHONE}</span>
            </a>
            <Link to="/connexion" data-testid="nav-login-btn">
              <Button variant="outline" className="border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white">
                <LogIn className="h-4 w-4 mr-2" />
                Connexion
              </Button>
            </Link>
            <Link to="/soumission">
              <Button 
                className="btn-accent"
                data-testid="nav-soumission-btn"
              >
                Soumission gratuite
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
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
          <div className="md:hidden py-4 border-t border-gray-100 animate-fade-in" data-testid="mobile-menu">
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
              <Link
                to="/connexion"
                className="mx-4 mt-2"
                onClick={() => setIsOpen(false)}
              >
                <Button variant="outline" className="w-full border-[#1a365d] text-[#1a365d]" data-testid="mobile-login-btn">
                  <LogIn className="h-4 w-4 mr-2" />
                  Connexion
                </Button>
              </Link>
              <Link
                to="/soumission"
                className="mx-4 mt-2"
                onClick={() => setIsOpen(false)}
              >
                <Button className="btn-accent w-full" data-testid="mobile-soumission-btn">
                  Soumission gratuite
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
