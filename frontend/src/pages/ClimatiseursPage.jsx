import { Snowflake } from 'lucide-react';
import { ServiceLanding } from '@/components/public/ServiceLanding';

export default function ClimatiseursPage() {
  return (
    <ServiceLanding
      testId="climatiseurs-page"
      seo={{
        title: 'Climatiseurs & thermopompes murales — Nettoyage et entretien | Déco Touché',
        description: 'Nettoyage, entretien et installation de climatiseurs et thermopompes murales à Montréal et sur la Rive-Sud. Prix selon notre catalogue.',
      }}
      hero={{
        icon: Snowflake,
        badge: 'Climatisation',
        title: 'Climatiseurs &',
        accent: 'thermopompes murales',
        subtitle: 'Un appareil propre consomme moins, refroidit mieux et vous fait respirer un air plus sain. Nettoyage en profondeur, entretien saisonnier et installation.',
        image: 'https://images.unsplash.com/photo-1665522557947-bfcdbe97e567?w=1600&q=80',
      }}
      featuresTitle="Ce que nous faisons"
      features={[
        'Nettoyage complet des filtres et de l\'unité intérieure',
        'Désinfection anti-moisissures et anti-odeurs',
        'Nettoyage des serpentins et du bac de condensation',
        'Vérification du drain et de l\'écoulement',
        'Entretien saisonnier (printemps / automne)',
        'Installation et remplacement de climatiseurs de fenêtre',
        'Protection des meubles et murs pendant l\'intervention',
        'Conseils d\'entretien entre deux visites',
      ]}
      categories={['hvac']}
      service="hvac"
      soumission="/soumission?service=hvac"
      steps={[
        { title: 'Demande', desc: 'Décrivez vos appareils (nombre, type, étage) dans le formulaire.' },
        { title: 'Prix confirmé', desc: 'Nous confirmons le prix selon notre catalogue et le nombre d\'unités.' },
        { title: 'Intervention', desc: 'Nettoyage en profondeur, sans dégât, avec protection des lieux.' },
        { title: 'Suivi', desc: 'Rappel pour le prochain entretien saisonnier.' },
      ]}
    />
  );
}
