import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';

// Map of route patterns to page titles. Order matters: more specific first.
const TITLE_MAP = [
  // Public
  { match: (p) => p === '/', title: 'Accueil' },
  { match: (p) => p === '/services', title: 'Nos services' },
  { match: (p) => p === '/services/peinture', title: 'Peinture intérieure & extérieure' },
  { match: (p) => p === '/services/renovation', title: 'Rénovation légère' },
  { match: (p) => p === '/services/entretien', title: 'Entretien général' },
  { match: (p) => p === '/services/climatiseurs', title: 'Climatiseurs & thermopompes' },
  { match: (p) => p === '/services/tv-tech', title: 'Installation TV & Tech' },
  { match: (p) => p === '/admin/agenda', title: 'Agenda' },
  { match: (p) => p === '/admin/site-settings', title: 'Paramètres du site' },
  { match: (p) => p === '/services/mobilier' || p === '/mobilier', title: 'Installation de mobilier' },
  { match: (p) => p === '/services/decoration' || p === '/decoration', title: 'Décoration — Vente + Installation' },
  { match: (p) => p === '/services/murs-accent' || p === '/murs-accent', title: 'Murs Accent · Cheminée & Télé sur mesure' },
  { match: (p) => p === '/portfolio', title: 'Portfolio' },
  { match: (p) => p === '/soumission', title: 'Soumission gratuite' },
  { match: (p) => p === '/paiement', title: 'Paiement de dépôt' },
  { match: (p) => p === '/paiement/succes', title: 'Paiement réussi' },
  { match: (p) => p === '/paiement/annule', title: 'Paiement annulé' },
  { match: (p) => p === '/contact', title: 'Contact' },
  { match: (p) => p === '/faq', title: 'FAQ' },
  { match: (p) => p === '/garantie', title: 'Garantie' },
  { match: (p) => p === '/confidentialite', title: 'Politique de confidentialité' },
  { match: (p) => p === '/conditions', title: 'Conditions d\u2019utilisation' },
  { match: (p) => p === '/blog', title: 'Blog' },
  { match: (p) => p.startsWith('/blog/'), title: 'Article de blog' },
  { match: (p) => p.startsWith('/services-peinture-') || p.startsWith('/services-saint-') || p.startsWith('/services/'), title: 'Services par ville' },

  // Auth / portal
  { match: (p) => p === '/connexion' || p === '/login', title: 'Connexion' },
  { match: (p) => p === '/portail-client' || p.startsWith('/client/'), title: 'Portail client' },
  { match: (p) => p.startsWith('/sign/'), title: 'Signature électronique' },

  // Admin
  { match: (p) => p === '/admin/login', title: 'Admin · Connexion' },
  { match: (p) => p === '/admin' || p === '/admin/dashboard', title: 'Admin · Tableau de bord' },
  { match: (p) => p.startsWith('/admin/leads'), title: 'Admin · Soumissions' },
  { match: (p) => p.startsWith('/admin/quotes'), title: 'Admin · Devis' },
  { match: (p) => p.startsWith('/admin/clients'), title: 'Admin · Clients' },
  { match: (p) => p.startsWith('/admin/invoices'), title: 'Admin · Factures' },
  { match: (p) => p.startsWith('/admin/projects'), title: 'Admin · Projets' },
  { match: (p) => p === '/admin/revenue', title: 'Admin · Revenus' },
  { match: (p) => p === '/admin/blog', title: 'Admin · Blog' },
  { match: (p) => p === '/admin/discounts', title: 'Admin · Promotions' },
  { match: (p) => p === '/admin/pricing', title: 'Admin · Tarification' },
  { match: (p) => p === '/admin/policies', title: 'Admin · Politiques' },
  { match: (p) => p === '/admin/users', title: 'Admin · Utilisateurs' },
  { match: (p) => p === '/admin/notifications', title: 'Admin · Notifications' },
  { match: (p) => p === '/admin/catalog', title: 'Admin · Catalogue' },
  { match: (p) => p === '/admin/portfolio', title: 'Admin · Portfolio' },
  { match: (p) => p === '/admin/social', title: 'Admin · Réseaux sociaux' },
  { match: (p) => p === '/admin/profile', title: 'Admin · Mon profil' },
  { match: (p) => p === '/mot-de-passe-oublie', title: 'Mot de passe oublié' },
  { match: (p) => p === '/reinitialiser-mot-de-passe', title: 'Réinitialiser le mot de passe' },
];

const SITE_NAME = 'Déco Touché';

const resolveTitle = (pathname) => {
  const entry = TITLE_MAP.find((e) => e.match(pathname));
  return entry ? `${entry.title} · ${SITE_NAME}` : SITE_NAME;
};

export default function RouteTitle() {
  const location = useLocation();
  // useParams here is a no-op (no params at this level) but keeps hook order stable
  useParams();

  useEffect(() => {
    document.title = resolveTitle(location.pathname);
  }, [location.pathname]);

  return null;
}
