import { Helmet } from 'react-helmet-async';

export default function FAQPage() {
  const faqs = [
    {
      category: "Général",
      questions: [
        {
          q: "Quelles régions desservez-vous?",
          a: "Nous desservons Montréal, la Rive-Sud (Longueuil, Brossard, Saint-Hubert, Saint-Lambert), Laval et les environs. Des frais de déplacement peuvent s'appliquer pour les zones éloignées."
        },
        {
          q: "Quels sont vos horaires d'ouverture?",
          a: "Nous sommes disponibles du lundi au vendredi de 8h à 20h, et le samedi-dimanche de 9h à 18h. Service d'urgence disponible 24/7 avec frais additionnels."
        },
        {
          q: "Comment puis-je obtenir une soumission?",
          a: "Vous pouvez demander une soumission gratuite via notre formulaire en ligne, par téléphone au 514-386-1743, ou par courriel à info@cmgeorges.com. Nous vous répondrons sous 24h."
        }
      ]
    },
    {
      category: "Déco Touché (Services manuels)",
      questions: [
        {
          q: "Quels types de peinture offrez-vous?",
          a: "Nous offrons la peinture intérieure et extérieure, incluant murs, plafonds, boiseries et portes. Nous utilisons des peintures de qualité professionnelle."
        },
        {
          q: "Fournissez-vous la peinture et le matériel?",
          a: "Oui, nous pouvons fournir la peinture et tout le matériel nécessaire. Vous pouvez aussi fournir votre propre peinture si vous le préférez."
        },
        {
          q: "Combien de temps prend la peinture d'un appartement?",
          a: "En moyenne, un 4½ prend 2-3 jours, un 5½ prend 3-4 jours. Cela dépend de l'état des murs et des travaux préparatoires nécessaires."
        }
      ]
    },
    {
      category: "Mobilier & Installation",
      questions: [
        {
          q: "Quelles marques de meubles assemblez-vous?",
          a: "Nous assemblons toutes les grandes marques: IKEA, JYSK, Structube, Wayfair, Amazon, Costco, et plus. Si ça s'assemble, on le fait!"
        },
        {
          q: "L'ancrage mural est-il obligatoire?",
          a: "Non, mais nous le recommandons fortement pour les commodes, étagères et garde-robes, surtout si vous avez des enfants. C'est une question de sécurité."
        },
        {
          q: "Pouvez-vous acheter et livrer les meubles?",
          a: "Oui! Nous offrons un service clé en main: achat, livraison, assemblage et installation. Demandez une soumission pour voir nos prix compétitifs vs le marché."
        },
        {
          q: "Quelle est votre garantie sur l'assemblage?",
          a: "Nous garantissons notre travail à 100%. Si quelque chose n'est pas correct, nous revenons gratuitement pour corriger dans les 30 jours."
        }
      ]
    },
    {
      category: "CMGeorges Tech",
      questions: [
        {
          q: "Quels types de sites web créez-vous?",
          a: "Sites vitrine, e-commerce, applications web, portails clients. Nous utilisons les technologies modernes (React, Next.js, Node.js, Python)."
        },
        {
          q: "Offrez-vous la maintenance après création?",
          a: "Oui, nous offrons des forfaits de maintenance mensuelle incluant mises à jour, sécurité, sauvegardes et support technique."
        },
        {
          q: "Combien coûte un site web?",
          a: "Un site vitrine commence à 1500$, un e-commerce à 3500$. Le prix final dépend de vos besoins spécifiques. Demandez une soumission gratuite!"
        }
      ]
    },
    {
      category: "Paiement & Facturation",
      questions: [
        {
          q: "Quels modes de paiement acceptez-vous?",
          a: "Nous acceptons les virements Interac, cartes de crédit, chèques et argent comptant."
        },
        {
          q: "Comment fonctionne le paiement?",
          a: "Typiquement: 30% à la signature, 30% à mi-projet, 40% à la complétion. Pour les petits projets, paiement à la fin des travaux."
        },
        {
          q: "Émettez-vous des factures avec TPS/TVQ?",
          a: "Oui, toutes nos factures incluent les taxes applicables (TPS 5% et TVQ 9.975%) détaillées séparément."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen" data-testid="faq-page">
      <Helmet>
        <title>FAQ - Questions Fréquentes | CMGeorges Montréal</title>
        <meta name="description" content="Trouvez les réponses à vos questions sur nos services de peinture, assemblage mobilier et développement web à Montréal et Rive-Sud." />
      </Helmet>

      {/* Header */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            Questions Fréquentes
          </h1>
          <p className="text-white/80 max-w-2xl">
            Trouvez rapidement les réponses à vos questions sur nos services.
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="section-spacing bg-[#F8FAFC]">
        <div className="container-main max-w-4xl">
          {faqs.map((category, idx) => (
            <div key={idx} className="mb-12" data-testid={`faq-category-${idx}`}>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-6 font-['Outfit'] flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#d4af37] flex items-center justify-center text-[#1a365d] text-sm font-bold">
                  {idx + 1}
                </span>
                {category.category}
              </h2>
              <div className="space-y-4">
                {category.questions.map((faq, faqIdx) => (
                  <div 
                    key={faqIdx} 
                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                    data-testid={`faq-item-${idx}-${faqIdx}`}
                  >
                    <h3 className="font-semibold text-[#1a365d] mb-2">{faq.q}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Contact CTA */}
          <div className="bg-[#1a365d] rounded-xl p-8 text-center mt-12">
            <h3 className="text-xl font-bold text-white mb-4 font-['Outfit']">
              Vous n'avez pas trouvé votre réponse?
            </h3>
            <p className="text-white/80 mb-6">
              Contactez-nous directement, nous serons heureux de vous aider!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="tel:+15143861743" 
                className="inline-flex items-center justify-center px-6 py-3 bg-[#d4af37] text-[#1a365d] font-bold rounded-lg hover:bg-[#d4af37]/90 transition-colors"
              >
                📞 514-386-1743
              </a>
              <a 
                href="mailto:info@cmgeorges.com" 
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white hover:text-[#1a365d] transition-colors"
              >
                ✉️ info@cmgeorges.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
