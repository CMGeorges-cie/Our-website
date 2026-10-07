import { Helmet } from 'react-helmet-async';
import { BRAND } from '@/config/brand';
import { useSiteSettings, paymentTermsFor, SERVICE_LABELS } from '@/lib/publicData';

export default function TermsPage() {
  const settings = useSiteSettings();
  const terms = paymentTermsFor(settings, 'default');
  return (
    <div className="min-h-screen" data-testid="terms-page">
      <Helmet>
        <title>Conditions Générales | Déco Touché</title>
        <meta name="description" content="Conditions générales de service de Déco Touché pour les services de rénovation, peinture et entretien." />
      </Helmet>

      {/* Header */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            Conditions Générales de Service
          </h1>
          <p className="text-white/80">Dernière mise à jour: Février 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="section-spacing bg-white">
        <div className="container-main max-w-4xl prose prose-lg">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">1. Acceptation des Conditions</h2>
              <p className="text-gray-600">
                En utilisant les services de Déco Touché, vous acceptez d'être lié par les présentes conditions générales. 
                Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">2. Description des Services</h2>
              <p className="text-gray-600 mb-4">Déco Touché offre trois catégories de services:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Déco Touché:</strong> Peinture, rénovation légère, entretien, installation TV murale</li>
                <li><strong>Mobilier:</strong> Assemblage, livraison et installation de meubles (IKEA, JYSK, etc.)</li>
                <li><strong>Tech:</strong> Développement web, applications, DevOps, maintenance</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">3. Soumissions et Devis</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Toutes les soumissions sont gratuites et sans engagement</li>
                <li>Les soumissions sont valides pour 30 jours sauf indication contraire</li>
                <li>Les prix incluent une provision pour imprévus (10-20%) clairement indiquée</li>
                <li>Les taxes (TPS et TVQ) sont affichées séparément</li>
                <li>Le prix final peut varier si l'étendue des travaux change</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">4. Modalités de Paiement</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                {(terms?.steps || []).map((st, i) => <li key={i} data-testid={`terms-step-${i}`}>{st.percent} % {st.label}</li>)}
                {terms?.note && <li>{terms.note}</li>}
                {Object.entries(settings?.payment_terms || {}).filter(([k]) => k !== 'default').map(([k]) => {
                  const t = paymentTermsFor(settings, k);
                  return <li key={k}>{SERVICE_LABELS[k] || k} : {t.summary}{t.note ? ` (${t.note})` : ''}</li>;
                })}
                <li>Modes acceptés: Interac, carte de crédit, chèque, comptant</li>
                <li>Les factures impayées portent intérêt à 2% par mois après 30 jours</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">5. Annulation et Remboursement</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Annulation avant début des travaux: remboursement complet du dépôt moins 50$ de frais administratifs</li>
                <li>Annulation après début des travaux: facturation des travaux complétés et matériaux commandés</li>
                <li>Reporter un rendez-vous: préavis de 48h requis, sans frais</li>
                <li>Report avec moins de 48h de préavis: frais de 50$</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">6. Garanties</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-[#1a365d]">Services manuels (Déco Touché)</h3>
                  <ul className="list-disc pl-6 text-gray-600 space-y-1">
                    <li>Garantie de 1 an sur la main-d'œuvre</li>
                    <li>Correction gratuite des défauts signalés dans les 30 jours</li>
                    <li>Exclut l'usure normale et les dommages causés par le client</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-[#1a365d]">Assemblage mobilier</h3>
                  <ul className="list-disc pl-6 text-gray-600 space-y-1">
                    <li>Garantie de 30 jours sur l'assemblage</li>
                    <li>Correction gratuite si problème lié à notre travail</li>
                    <li>Exclut les pièces manquantes ou défectueuses du fabricant</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-[#1a365d]">Services Tech</h3>
                  <ul className="list-disc pl-6 text-gray-600 space-y-1">
                    <li>Garantie de 90 jours sur les bugs et erreurs</li>
                    <li>Support technique inclus pendant la période de garantie</li>
                    <li>Exclut les modifications demandées après livraison</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">7. Responsabilité</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Déco Touché est assuré pour les dommages causés lors des travaux</li>
                <li>Notre responsabilité est limitée au montant du contrat</li>
                <li>Le client doit signaler tout problème existant avant les travaux</li>
                <li>Nous ne sommes pas responsables des vices cachés des meubles du fabricant</li>
                <li>Pour les services tech: pas de garantie de résultats commerciaux (ventes, trafic)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">8. Accès aux Lieux</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Le client doit fournir un accès adéquat aux lieux de travail</li>
                <li>Les espaces de travail doivent être dégagés avant notre arrivée</li>
                <li>Le client est responsable de déplacer les objets de valeur</li>
                <li>Un adulte doit être présent ou accessible pendant les travaux</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">9. Propriété Intellectuelle</h2>
              <p className="text-gray-600">
                Pour les services Tech: le client devient propriétaire du code source et des livrables 
                une fois le paiement complet effectué. Déco Touché conserve le droit d'utiliser des extraits 
                anonymisés dans son portfolio.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">10. Force Majeure</h2>
              <p className="text-gray-600">
                Déco Touché n'est pas responsable des retards ou de l'impossibilité d'exécuter les services 
                en raison de circonstances indépendantes de notre volonté (pandémie, catastrophes naturelles, 
                grèves, pénuries de matériaux, etc.).
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">11. Litiges</h2>
              <p className="text-gray-600">
                Les présentes conditions sont régies par les lois du Québec. Tout litige sera soumis aux 
                tribunaux compétents du district judiciaire de Montréal. Avant toute procédure judiciaire, 
                les parties s'engagent à tenter une résolution à l'amiable.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">12. Contact</h2>
              <p className="text-gray-600">
                Pour toute question concernant ces conditions:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700"><strong>{BRAND.legalName}</strong></p>
                <p className="text-gray-600">Courriel: {BRAND.email}</p>
                <p className="text-gray-600">Téléphone: {BRAND.phone.display}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

