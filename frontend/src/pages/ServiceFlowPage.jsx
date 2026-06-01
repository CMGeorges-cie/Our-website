import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Zap, 
  ArrowRight, 
  CheckCircle, 
  Users, 
  Receipt, 
  Calendar, 
  MessageSquare,
  Building2,
  Wrench,
  ClipboardList,
  Shield,
  Clock,
  BarChart3,
  Smartphone
} from 'lucide-react';
import { BRAND_LOGO_URL as SERVICEFLOW_LOGO, BRAND } from '@/config/brand';

const problems = [
  { icon: MessageSquare, text: 'Messages clients dispersés' },
  { icon: Receipt, text: 'Factures manuelles ou Excel' },
  { icon: Calendar, text: 'Planification chaotique' },
  { icon: Users, text: 'Communication fragmentée' },
  { icon: ClipboardList, text: 'Suivi de projets difficile' },
  { icon: BarChart3, text: 'Aucune visibilité financière' },
];

const solutions = [
  { icon: Users, title: 'CRM Clients', desc: 'Base de données clients centralisée avec historique complet' },
  { icon: Receipt, title: 'Facturation', desc: 'Devis, factures et paiements en ligne automatisés' },
  { icon: Calendar, title: 'Planification', desc: 'Calendrier intégré et assignation des techniciens' },
  { icon: ClipboardList, title: 'Gestion de projets', desc: 'Suivi des travaux avec photos et rapports' },
  { icon: MessageSquare, title: 'Portail client', desc: 'Espace dédié pour vos clients avec messaging' },
  { icon: BarChart3, title: 'Tableaux de bord', desc: 'Analytiques et KPIs en temps réel' },
];

const targetAudience = [
  { icon: Wrench, title: 'Handyman', desc: 'Services de réparation et entretien' },
  { icon: Building2, title: 'Entrepreneurs', desc: 'Rénovation et construction' },
  { icon: Building2, title: 'Gestionnaires d\'immeubles', desc: 'Maintenance et gestion locative' },
  { icon: Wrench, title: 'Entreprises de maintenance', desc: 'Services réguliers et contrats' },
];

export default function ServiceFlowPage() {
  return (
    <div data-testid="serviceflow-page">
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#23153c]">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl -top-48 -left-48"></div>
          <div className="absolute w-96 h-96 bg-[#d4af37]/5 rounded-full blur-3xl bottom-0 right-0"></div>
        </div>
        
        <div className="container-main relative z-10 py-20">
          <div className="max-w-3xl mx-auto text-center">
            {/* Built by badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 mb-8">
              <span className="text-white/60 text-sm">Développé par</span>
              <img 
                src={SERVICEFLOW_LOGO} 
                alt={BRAND.name}
                className="h-5 w-auto brightness-0 invert opacity-80"
              />
              <span className="text-white/80 text-sm font-medium">{BRAND.name}</span>
            </div>
            
            {/* Logo */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <img 
                src={SERVICEFLOW_LOGO} 
                alt="ServiceFlow" 
                className="w-20 h-20 rounded-2xl shadow-lg shadow-[#d4af37]/30"
              />
              <span className="text-4xl md:text-5xl font-black text-white tracking-tight font-['Outfit']">
                Service<span className="text-[#d4af37]">Flow</span>
              </span>
            </div>
            
            <h1 className="text-xl md:text-2xl text-white/80 mb-8 font-light">
              Le CRM conçu pour les entreprises de services
            </h1>
            
            <p className="text-lg text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
              Gérez vos clients, projets, factures et équipes depuis une seule plateforme. 
              Conçu par des entrepreneurs pour des entrepreneurs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/serviceflow/pricing">
                <Button size="lg" className="bg-[#d4af37] hover:bg-[#c9a432] text-[#1a365d] font-bold px-8">
                  Voir les tarifs
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/connexion">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Se connecter
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-[#f8fafc]">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
              Le problème des entrepreneurs de services
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Vous perdez du temps et de l'argent à gérer votre entreprise avec des outils dispersés.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {problems.map((problem, idx) => {
              const Icon = problem.icon;
              return (
                <div 
                  key={idx}
                  className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-red-100"
                >
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-red-500" />
                  </div>
                  <span className="text-sm text-gray-700">{problem.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-white">
        <div className="container-main">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-[#d4af37]/10 text-[#d4af37] text-sm font-semibold rounded-full mb-4">
              La solution
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
              Tout centraliser avec ServiceFlow
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Une plateforme unique pour gérer tous les aspects de votre entreprise de services.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {solutions.map((solution, idx) => {
              const Icon = solution.icon;
              return (
                <Card key={idx} className="group hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-[#d4af37]/20">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-[#1a365d] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#d4af37] transition-colors">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-[#1a365d] mb-2 font-['Outfit']">{solution.title}</h3>
                    <p className="text-gray-600 text-sm">{solution.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-20 bg-[#1a365d]">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
              Pour qui est <span className="text-[#d4af37]">ServiceFlow</span>?
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Conçu spécifiquement pour les entreprises qui offrent des services sur le terrain.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {targetAudience.map((audience, idx) => {
              const Icon = audience.icon;
              return (
                <div 
                  key={idx}
                  className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-colors"
                >
                  <div className="w-16 h-16 bg-[#d4af37] rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-[#1a365d]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{audience.title}</h3>
                  <p className="text-white/60 text-sm">{audience.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Highlight */}
      <section className="py-20 bg-[#f8fafc]">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block px-4 py-2 bg-[#1a365d]/10 text-[#1a365d] text-sm font-semibold rounded-full mb-4">
                Pourquoi nous?
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-6 font-['Outfit']">
                Créé par une entreprise de services, pour les entreprises de services
              </h2>
              <p className="text-gray-600 mb-8">
                Chez CMGeorges, nous utilisons ServiceFlow au quotidien pour gérer nos propres opérations. 
                Chaque fonctionnalité est pensée pour résoudre de vrais problèmes terrain.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: Shield, text: 'Données sécurisées et hébergées au Canada' },
                  { icon: Clock, text: 'Mise en place en moins de 24h' },
                  { icon: Smartphone, text: 'Accessible sur mobile et tablette' },
                  { icon: Users, text: 'Support en français' },
                ].map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#d4af37]/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#d4af37]" />
                      </div>
                      <span className="text-gray-700">{feature.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-[#1a365d] to-[#0f0f1a] rounded-2xl p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <img 
                    src={SERVICEFLOW_LOGO} 
                    alt="ServiceFlow" 
                    className="w-10 h-10 rounded-lg"
                  />
                  <span className="text-xl font-bold text-white font-['Outfit']">
                    Service<span className="text-[#d4af37]">Flow</span>
                  </span>
                </div>
                <div className="space-y-4">
                  {['Tableau de bord', 'Leads', 'Clients', 'Projets', 'Factures'].map((item, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-lg ${idx === 0 ? 'bg-white/10' : 'hover:bg-white/5'} transition-colors`}
                    >
                      <div className="w-2 h-2 rounded-full bg-[#d4af37]"></div>
                      <span className="text-white/80">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-xl p-4 shadow-xl flex items-center gap-3">
                <img 
                  src={SERVICEFLOW_LOGO} 
                  alt={BRAND.name}
                  className="h-8 w-auto"
                />
                <div className="text-xs">
                  <div className="font-bold text-[#1a365d]">Built by {BRAND.name}</div>
                  <div className="text-gray-500">{BRAND.address}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-20 bg-[#d4af37]">
        <div className="container-main text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-4 font-['Outfit']">
            Prêt à simplifier votre gestion?
          </h2>
          <p className="text-[#1a365d]/80 mb-8 max-w-xl mx-auto">
            Commencez dès aujourd'hui avec notre plan Starter à 29$/mois. Sans engagement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/serviceflow/pricing">
              <Button size="lg" className="bg-[#1a365d] hover:bg-[#0f1f3d] text-white font-bold px-8">
                Voir les tarifs
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white">
                Nous contacter
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
