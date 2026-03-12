import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { saasApi } from '@/lib/api';
import { toast } from 'sonner';
import { Check, Crown, Building2, ArrowRight, Star, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAuthenticated } from '@/lib/utils';

const SERVICEFLOW_LOGO = "https://customer-assets.emergentagent.com/job_57c7ca12-f939-4f77-840a-6e3a2010ce9e/artifacts/xu0d6vd3_ChatGPT%20Image%20Mar%2011%2C%202026%2C%2011_52_31%20PM.png";

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    description: 'Parfait pour démarrer',
    icon: Rocket,
    color: 'text-white',
    features: [
      '2 utilisateurs inclus',
      '50 projets actifs',
      '5GB de stockage',
      'Portail client',
      'Devis & Factures PDF',
      'Envoi par email',
    ],
    recommended: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    description: 'Pour les équipes en croissance',
    icon: Crown,
    color: 'text-yellow-400',
    features: [
      '5 utilisateurs inclus',
      '200 projets actifs',
      '25GB de stockage',
      'Tout Starter inclus',
      'Work Orders & Calendrier',
      'Gestion des dépenses',
      'Tableaux de bord avancés',
    ],
    recommended: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 149,
    description: 'Pour les grandes équipes',
    icon: Building2,
    color: 'text-blue-400',
    features: [
      'Utilisateurs illimités',
      'Projets illimités',
      '100GB de stockage',
      'Tout Pro inclus',
      'Multi-tenant',
      'Accès API',
      'Support prioritaire',
      'Onboarding personnalisé',
    ],
    recommended: false,
  },
];

export default function ServiceFlowPricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const isLoggedIn = isAuthenticated();

  useEffect(() => {
    if (isLoggedIn) {
      saasApi.getMySubscription().then(res => {
        if (res.data?.plan_id) setCurrentPlan(res.data.plan_id);
      }).catch(() => {});
    }
  }, [isLoggedIn]);

  const handleSubscribe = async (planId) => {
    if (!isLoggedIn) { navigate('/admin/login'); return; }
    setLoading(planId);
    try {
      const res = await saasApi.subscribe(planId);
      if (res.data.url) window.location.href = res.data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la redirection vers le paiement');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d1f] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="border-b border-white/10 bg-[#0d0d1f]/80 backdrop-blur-sm relative z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src={SERVICEFLOW_LOGO} 
              alt="ServiceFlow" 
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-black text-white text-lg">Service<span className="text-yellow-400">Flow</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link to="/admin/dashboard">
                <Button className="bg-yellow-400 hover:bg-yellow-300 text-[#23153c] font-semibold" data-testid="go-to-dashboard-btn">
                  Mon espace <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <Link to="/admin/login">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/5" data-testid="login-btn-pricing">
                  Connexion
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative z-10 text-center pt-20 pb-16 px-4">
        <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-sm font-medium px-4 py-2 rounded-full mb-6">
          <Star className="w-3.5 h-3.5" />
          Essai gratuit 14 jours — aucune carte requise
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white mb-5" style={{fontFamily: 'Outfit, sans-serif'}}>
          Des prix simples,<br />
          <span className="text-yellow-400">sans surprises</span>
        </h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto mb-8">
          ServiceFlow est le CRM conçu pour les entrepreneurs, handyman et gestionnaires d'immeuble. Gérez clients, projets et factures — tout en un.
        </p>
        <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-400" />Facturation mensuelle</span>
          <span className="mx-3">·</span>
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-400" />Annulable en tout temps</span>
          <span className="mx-3">·</span>
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-400" />Support en français</span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-20" data-testid="pricing-plans">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 border transition-all duration-300 hover:-translate-y-1 ${
                  plan.recommended
                    ? 'bg-gradient-to-b from-yellow-400/10 to-transparent border-yellow-400/40 shadow-2xl shadow-yellow-400/10'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
                data-testid={`pricing-plan-${plan.id}`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-yellow-400 text-[#23153c] text-xs font-black px-4 py-1.5 rounded-full tracking-wider uppercase">
                      Recommandé
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.recommended ? 'bg-yellow-400/20' : 'bg-white/10'}`}>
                    <Icon className={`w-5 h-5 ${plan.color}`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${plan.color}`}>{plan.name}</h3>
                    <p className="text-white/40 text-xs">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-black text-white">{plan.price}$</span>
                  <span className="text-white/40 text-sm"> / mois</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id || isCurrentPlan}
                  className={`w-full py-3 font-bold rounded-xl transition-all ${
                    plan.recommended
                      ? 'bg-yellow-400 hover:bg-yellow-300 text-[#23153c] shadow-lg shadow-yellow-400/20'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  } ${isCurrentPlan ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid={`subscribe-${plan.id}-btn`}
                >
                  {loading === plan.id ? 'Redirection...' : isCurrentPlan ? 'Plan actuel' : 'Commencer maintenant'}
                </Button>
              </div>
            );
          })}
        </div>

        {/* FAQ / Features */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Tous les plans incluent</h2>
          <p className="text-white/40 mb-10">Fonctionnalités de base disponibles sur tous les plans</p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { title: 'Devis & Factures', desc: 'Génération PDF et envoi par email' },
              { title: 'Portail Client', desc: 'Vos clients suivent leurs projets en ligne' },
              { title: 'Sécurité RBAC', desc: 'Contrôle d\'accès par rôles' },
              { title: 'Support français', desc: 'Assistance en français du lundi au vendredi' },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 text-left">
                <p className="font-semibold text-white mb-1">{item.title}</p>
                <p className="text-white/40 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-white/20 text-sm mt-16">
          © {new Date().getFullYear()} ServiceFlow — Une plateforme Emergent Labs. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
