import { Tv } from 'lucide-react';
import { ServiceLanding } from '@/components/public/ServiceLanding';

export default function TvTechPage() {
  return (
    <ServiceLanding
      testId="tv-tech-page"
      seo={{
        title: 'Installation TV murale & services Tech | Déco Touché',
        description: 'Installation de téléviseurs au mur, câblage dissimulé, barre de son et solutions technologiques à Montréal et sur la Rive-Sud. Prix selon notre catalogue.',
      }}
      hero={{
        icon: Tv,
        badge: 'TV & Tech',
        title: 'Installation TV',
        accent: '& Tech',
        subtitle: 'Votre téléviseur bien fixé, de niveau, sans fils apparents. Installation murale, audio-vidéo et solutions technologiques pour la maison et les petites entreprises.',
        image: 'https://images.unsplash.com/photo-1773867567872-3ad1fa481082?w=1600&q=80',
      }}
      featuresTitle="Nos services TV & Tech"
      features={[
        'Installation murale de téléviseurs (fixe, inclinable, articulé)',
        'Fixation dans les montants ou sur béton / brique',
        'Câblage dissimulé dans le mur ou en goulotte',
        'Installation de barre de son et caisson',
        'Configuration Wi-Fi, appareils intelligents et diffusion',
        'Intégration au-dessus d\'un foyer ou dans un mur d\'accent',
        'Site web vitrine pour travailleurs autonomes et PME',
        'Nettoyage et récupération des emballages',
      ]}
      categories={['installation', 'tech']}
      service="installation"
      soumission="/soumission?service=tech"
      steps={[
        { title: 'Demande', desc: 'Taille de la TV, type de mur et support souhaité.' },
        { title: 'Prix confirmé', desc: 'Prix selon notre catalogue, options de câblage incluses.' },
        { title: 'Installation', desc: 'Fixation solide et de niveau, câbles dissimulés.' },
        { title: 'Configuration', desc: 'Branchements, tests et explication de vos appareils.' },
      ]}
    />
  );
}
