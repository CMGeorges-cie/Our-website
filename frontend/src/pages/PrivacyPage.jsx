import { Helmet } from 'react-helmet-async';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" data-testid="privacy-page">
      <Helmet>
        <title>Politique de Confidentialité | CMGeorges</title>
        <meta name="description" content="Politique de confidentialité de CMGeorges. Découvrez comment nous protégeons vos données personnelles." />
      </Helmet>

      {/* Header */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            Politique de Confidentialité
          </h1>
          <p className="text-white/80">Dernière mise à jour: Février 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="section-spacing bg-white">
        <div className="container-main max-w-4xl prose prose-lg">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">1. Introduction</h2>
              <p className="text-gray-600">
                CMGeorges ("nous", "notre", "nos") s'engage à protéger la confidentialité de vos informations personnelles. 
                Cette politique explique comment nous collectons, utilisons et protégeons vos données lorsque vous utilisez 
                notre site web et nos services.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">2. Informations Collectées</h2>
              <p className="text-gray-600 mb-4">Nous collectons les types d'informations suivants:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Informations de contact:</strong> nom, adresse courriel, numéro de téléphone, adresse postale</li>
                <li><strong>Informations de projet:</strong> description des services demandés, préférences, photos</li>
                <li><strong>Informations de navigation:</strong> adresse IP, type de navigateur, pages visitées (via cookies)</li>
                <li><strong>Informations de paiement:</strong> traitées de manière sécurisée par nos partenaires de paiement</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">3. Utilisation des Informations</h2>
              <p className="text-gray-600 mb-4">Vos informations sont utilisées pour:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Répondre à vos demandes de soumission et questions</li>
                <li>Fournir et améliorer nos services</li>
                <li>Vous contacter concernant votre projet</li>
                <li>Envoyer des communications marketing (avec votre consentement)</li>
                <li>Analyser l'utilisation de notre site pour l'améliorer</li>
                <li>Respecter nos obligations légales</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">4. Partage des Informations</h2>
              <p className="text-gray-600 mb-4">
                Nous ne vendons jamais vos informations personnelles. Nous pouvons partager vos informations avec:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Nos sous-traitants et partenaires pour la réalisation des services</li>
                <li>Nos fournisseurs de services (hébergement, paiement, courriel)</li>
                <li>Les autorités légales si requis par la loi</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">5. Cookies et Technologies Similaires</h2>
              <p className="text-gray-600 mb-4">
                Notre site utilise des cookies pour améliorer votre expérience:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Cookies essentiels:</strong> nécessaires au fonctionnement du site</li>
                <li><strong>Cookies analytiques:</strong> Google Analytics pour comprendre l'utilisation du site</li>
                <li><strong>Cookies marketing:</strong> Meta Pixel pour mesurer l'efficacité de nos publicités</li>
              </ul>
              <p className="text-gray-600 mt-4">
                Vous pouvez configurer votre navigateur pour refuser les cookies, mais certaines fonctionnalités 
                pourraient ne pas fonctionner correctement.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">6. Sécurité des Données</h2>
              <p className="text-gray-600">
                Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos informations contre 
                l'accès non autorisé, la modification, la divulgation ou la destruction. Cela inclut le chiffrement 
                des données en transit (HTTPS) et au repos, ainsi que des contrôles d'accès stricts.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">7. Conservation des Données</h2>
              <p className="text-gray-600">
                Nous conservons vos informations personnelles aussi longtemps que nécessaire pour fournir nos services 
                et respecter nos obligations légales. Les données des projets sont conservées pendant 7 ans conformément 
                aux exigences fiscales.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">8. Vos Droits</h2>
              <p className="text-gray-600 mb-4">Conformément à la Loi sur la protection des renseignements personnels du Québec, vous avez le droit de:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Accéder à vos informations personnelles</li>
                <li>Rectifier des informations inexactes</li>
                <li>Demander la suppression de vos données</li>
                <li>Retirer votre consentement aux communications marketing</li>
                <li>Porter plainte auprès de la Commission d'accès à l'information du Québec</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">9. Contact</h2>
              <p className="text-gray-600">
                Pour toute question concernant cette politique ou pour exercer vos droits, contactez-nous:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700"><strong>CMGeorges</strong></p>
                <p className="text-gray-600">Courriel: cmgeorges.cie@gmail.com</p>
                <p className="text-gray-600">Téléphone: 514-386-1743</p>
                <p className="text-gray-600">Montréal, QC, Canada</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">10. Modifications</h2>
              <p className="text-gray-600">
                Nous pouvons mettre à jour cette politique de temps en temps. Les modifications seront publiées 
                sur cette page avec une date de mise à jour. Nous vous encourageons à consulter régulièrement 
                cette politique.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
