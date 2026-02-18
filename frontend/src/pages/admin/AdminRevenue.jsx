import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  PieChart,
  BarChart3,
  AlertCircle,
  Briefcase
} from 'lucide-react';

export default function AdminRevenue() {
  const [ceoData, setCeoData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await adminApi.getCeoDashboard();
        setCeoData(response.data);
      } catch (error) {
        console.error('Error fetching CEO dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (!ceoData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Impossible de charger les données</p>
      </div>
    );
  }

  const profitMargin = ceoData.monthly_revenue > 0 
    ? ((ceoData.monthly_profit / ceoData.monthly_revenue) * 100).toFixed(1)
    : 0;

  return (
    <div data-testid="admin-revenue">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a365d] font-['Outfit']">Dashboard CEO</h1>
        <p className="text-gray-500">Vue d'ensemble de la performance financière</p>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-[#1a365d] text-white" data-testid="revenue-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">Revenus du mois</p>
                <p className="text-3xl font-bold">{formatCurrency(ceoData.monthly_revenue)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-[#d4af37]" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="costs-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Coûts estimés</p>
                <p className="text-3xl font-bold text-gray-700">{formatCurrency(ceoData.monthly_costs)}</p>
              </div>
              <TrendingDown className="h-10 w-10 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50" data-testid="profit-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm mb-1">Profit net</p>
                <p className="text-3xl font-bold text-green-700">{formatCurrency(ceoData.monthly_profit)}</p>
                <p className="text-xs text-green-600 mt-1">Marge: {profitMargin}%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="pending-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">À recevoir</p>
                <p className="text-3xl font-bold text-yellow-600">{formatCurrency(ceoData.pending_invoices_amount)}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Margins & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card data-testid="margins-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#d4af37]" />
              Marges par division
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Déco Touché (Manuel)</span>
                  <span className="font-semibold text-[#1a365d]">{ceoData.average_margin_manual}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#1a365d] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(ceoData.average_margin_manual, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Cible: 50-60%</p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">CMGeorges Tech</span>
                  <span className="font-semibold text-[#007AFF]">{ceoData.average_margin_tech}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#007AFF] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(ceoData.average_margin_tech, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Cible: 60-75%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="conversion-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-[#d4af37]" />
              Taux de conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#E2E8F0"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#1a365d"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${ceoData.conversion_rate * 3.52} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-3xl font-bold text-[#1a365d]">
                  {ceoData.conversion_rate}%
                </span>
              </div>
              <p className="text-gray-500 mt-4">Leads convertis en clients</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Month & Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="revenue-chart-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#d4af37]" />
              Revenus (6 derniers mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ceoData.revenue_by_month.map((month, idx) => {
                const maxRevenue = Math.max(...ceoData.revenue_by_month.map(m => m.revenue), 1);
                const percentage = (month.revenue / maxRevenue) * 100;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{month.month}</span>
                      <span className="font-medium text-[#1a365d]">{formatCurrency(month.revenue)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#1a365d] to-[#d4af37] rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="top-services-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#d4af37]" />
              Top services (projets gagnés)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ceoData.top_services.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Pas encore de données</p>
            ) : (
              <div className="space-y-4">
                {ceoData.top_services.map((service, idx) => {
                  const labels = {
                    manual: 'Déco Touché',
                    furniture: 'Mobilier',
                    tech: 'CMGeorges Tech'
                  };
                  const colors = {
                    manual: 'bg-[#1a365d]',
                    furniture: 'bg-[#E07A5F]',
                    tech: 'bg-[#007AFF]'
                  };
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${colors[service.service] || 'bg-gray-400'}`} />
                        <span className="font-medium">{labels[service.service] || service.service}</span>
                      </div>
                      <span className="text-lg font-bold text-[#1a365d]">{service.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects Status */}
      <Card className="mt-6" data-testid="projects-status-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Projets en cours</p>
              <p className="text-2xl font-bold text-[#1a365d]">{ceoData.projects_in_progress}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">À surveiller pour la planification</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
