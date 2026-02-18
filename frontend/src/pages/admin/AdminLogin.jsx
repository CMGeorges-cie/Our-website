import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi, seedDatabase } from '@/lib/api';
import { setAuthData, isAuthenticated } from '@/lib/utils';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(credentials.email, credentials.password);
      setAuthData(response.data.access_token, response.data.user);
      toast.success('Connexion réussie!');
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erreur de connexion', {
        description: error.response?.data?.detail || 'Identifiants invalides'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    setSeeding(true);
    try {
      const response = await seedDatabase();
      toast.success('Base de données initialisée!', {
        description: `Admin: ${response.data.admin_email} / ${response.data.admin_password}`
      });
      setCredentials({
        email: response.data.admin_email,
        password: response.data.admin_password
      });
    } catch (error) {
      console.error('Seed error:', error);
      if (error.response?.data?.message === 'Database already seeded') {
        toast.info('Base de données déjà initialisée', {
          description: 'Utilisez admin@cmgeorges.com / admin123'
        });
        setCredentials({
          email: 'admin@cmgeorges.com',
          password: 'admin123'
        });
      } else {
        toast.error('Erreur lors de l\'initialisation');
      }
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a365d] flex items-center justify-center p-4" data-testid="admin-login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#d4af37] rounded-lg flex items-center justify-center">
              <span className="text-[#1a365d] text-2xl font-bold">🦁</span>
            </div>
            <span className="text-3xl font-bold text-white font-['Outfit']">CMGeorges</span>
          </div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Administration</h1>
          <p className="text-white/60 text-sm">Connectez-vous pour accéder au tableau de bord</p>
        </div>

        <Card className="shadow-2xl" data-testid="login-card">
          <CardHeader>
            <CardTitle className="text-xl text-[#1a365d]">Connexion</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="form-group">
                <Label htmlFor="email">Courriel</Label>
                <Input
                  id="email"
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  placeholder="admin@cmgeorges.com"
                  required
                  data-testid="login-email"
                />
              </div>

              <div className="form-group">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  data-testid="login-password"
                />
              </div>

              <Button 
                type="submit" 
                className="btn-primary w-full" 
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? (
                  'Connexion...'
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Se connecter
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center mb-3">
                Première utilisation? Initialisez la base de données:
              </p>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleSeedDatabase}
                disabled={seeding}
                data-testid="seed-database-btn"
              >
                {seeding ? 'Initialisation...' : 'Initialiser les données de démo'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-white/40 text-xs mt-6">
          © {new Date().getFullYear()} CMGeorges. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
