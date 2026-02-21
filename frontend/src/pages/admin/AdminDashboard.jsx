import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  UserPlus,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminApi.getStats();
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { 
      title: 'Total Leads', 
      value: stats?.total_leads || 0, 
      icon: Users, 
      color: 'from-gold-500 to-gold-600',
      link: '/admin/leads'
    },
    { 
      title: 'Nouveaux', 
      value: stats?.new_leads || 0, 
      icon: UserPlus, 
      color: 'from-blue-500 to-blue-600',
      link: '/admin/leads?status=new'
    },
    { 
      title: 'En attente', 
      value: stats?.contacted_leads || 0, 
      icon: Clock, 
      color: 'from-yellow-500 to-yellow-600',
      link: '/admin/leads?status=contacted'
    },
    { 
      title: 'Soumissions', 
      value: stats?.total_quotes || 0, 
      icon: FileText, 
      color: 'from-purple-500 to-purple-600'
    },
    { 
      title: 'Gagnés', 
      value: stats?.won_leads || 0, 
      icon: CheckCircle, 
      color: 'from-green-500 to-green-600',
      link: '/admin/leads?status=won'
    },
    { 
      title: 'Perdus', 
      value: stats?.lost_leads || 0, 
      icon: XCircle, 
      color: 'from-red-500 to-red-600',
      link: '/admin/leads?status=lost'
    },
  ];

  return (
    <div data-testid="admin-dashboard">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white font-['Outfit']">Tableau de bord</h1>
        <p className="text-gray-500">Vue d'ensemble de votre activité</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          const content = (
            <Card className="bg-gray-900 border-gray-800 hover:border-gold-500/50 transition-all cursor-pointer group" data-testid={`stat-card-${stat.title.toLowerCase().replace(' ', '-')}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-white font-['Outfit'] group-hover:text-gold-500 transition-colors">
                      {loading ? '-' : stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );

          return stat.link ? (
            <Link key={idx} to={stat.link}>
              {content}
            </Link>
          ) : (
            <div key={idx}>{content}</div>
          );
        })}
      </div>

      {/* Conversion Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800" data-testid="conversion-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-gold-500" />
              Taux de conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-6xl font-bold text-gold-500 font-['Outfit']">
                {loading ? '-' : `${stats?.conversion_rate || 0}%`}
              </p>
              <p className="text-gray-500 mt-2">Leads gagnés / Total</p>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400 transition-all duration-500 shadow-lg shadow-gold-500/30"
                style={{ width: `${stats?.conversion_rate || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800" data-testid="quick-actions-card">
          <CardHeader>
            <CardTitle className="text-white">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link 
              to="/admin/leads?status=new" 
              className="flex items-center justify-between p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <UserPlus className="h-5 w-5 text-blue-400" />
                <span className="font-medium text-blue-300">Nouveaux leads à traiter</span>
              </div>
              <span className="text-2xl font-bold text-blue-400">{stats?.new_leads || 0}</span>
            </Link>
            
            <Link 
              to="/admin/leads?status=contacted" 
              className="flex items-center justify-between p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-500/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-400" />
                <span className="font-medium text-yellow-300">En attente de soumission</span>
              </div>
              <span className="text-2xl font-bold text-yellow-400">{stats?.contacted_leads || 0}</span>
            </Link>

            <Link 
              to="/admin/leads?status=quoted" 
              className="flex items-center justify-between p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-400" />
                <span className="font-medium text-purple-300">Soumissions en attente</span>
              </div>
              <span className="text-2xl font-bold text-purple-400">{stats?.quoted_leads || 0}</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
