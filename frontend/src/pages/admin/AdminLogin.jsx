import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi, seedDatabase } from '@/lib/api';
import { setAuthData, isAuthenticated } from '@/lib/utils';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';
import { BRAND_LOGO_URL as SERVICEFLOW_LOGO } from '@/config/brand';

export default function AdminLogin() {
  const navigate = useNavigate();
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  useEffect(() => {
    if (isAuthenticated()) navigate('/admin/dashboard');
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    const loadVanta = async () => {
      try {
        const THREE = await import('three');
        const VANTA = await import('vanta/dist/vanta.net.min');
        if (mounted && vantaRef.current && !vantaEffect.current) {
          vantaEffect.current = VANTA.default({
            el: vantaRef.current,
            THREE: THREE,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200,
            minWidth: 200,
            scale: 1.0,
            scaleMobile: 1.0,
            color: 0xffe700,
            backgroundColor: 0x23153c,
            points: 10,
            maxDistance: 20,
            spacing: 15,
            showDots: true,
          });
        }
      } catch (e) {
        console.warn('Vanta load error:', e);
      }
    };
    loadVanta();
    return () => {
      mounted = false;
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authApi.login(credentials.email, credentials.password);
      setAuthData(response.data.access_token, response.data.user);
      toast.success('Connexion réussie!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error('Identifiants invalides', {
        description: error.response?.data?.detail || 'Vérifiez votre email et mot de passe'
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
      setCredentials({ email: response.data.admin_email, password: response.data.admin_password });
    } catch (error) {
      if (error.response?.data?.message === 'Database already seeded') {
        toast.info('Base de données déjà initialisée');
        // No hardcoded fallback — user must enter their own credentials
      } else {
        toast.error('Erreur lors de l\'initialisation');
      }
    } finally {
      setSeeding(false); }
  };

  return (
    <div ref={vantaRef} className="min-h-screen flex items-center justify-center p-4 relative" data-testid="admin-login-page">
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Déco Touché Admin Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img 
              src={SERVICEFLOW_LOGO} 
              alt="Déco Touché" 
              className="w-12 h-12 rounded-xl shadow-lg shadow-yellow-400/30"
            />
            <span className="text-3xl font-black text-white tracking-tight" style={{fontFamily: 'Outfit, sans-serif'}}>
              Déco <span className="text-yellow-400">Touché</span>
            </span>
          </div>
          <p className="text-white/50 text-sm tracking-wider uppercase">Espace administration</p>
        </div>

        {/* Login Card */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8" data-testid="login-card">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">Administration</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-white/70 text-sm mb-1.5 block">Courriel</Label>
              <Input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                placeholder="admin@cmgeorges.com"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-yellow-400 focus:ring-yellow-400/20"
                data-testid="login-email"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-white/70 text-sm mb-1.5 block">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="••••••••"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-yellow-400 focus:ring-yellow-400/20"
                data-testid="login-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-[#23153c] font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40 hover:scale-[1.01]"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-[#23153c] border-t-transparent rounded-full animate-spin"></div>Connexion...</span>
              ) : (
                <span className="flex items-center justify-center gap-2"><LogIn className="h-4 w-4" />Se connecter</span>
              )}
            </Button>
          </form>

          {/* Client Portal Link */}
          <div className="mt-4 text-center">
            <Link to="/client/login" className="text-yellow-400/70 hover:text-yellow-400 text-sm transition-colors" data-testid="client-portal-link">
              Accès portail client →
            </Link>
          </div>

          <div className="mt-6 pt-5 border-t border-white/10">
            <Button
              variant="ghost"
              className="w-full text-white/40 hover:text-white/60 hover:bg-white/5 text-xs"
              onClick={handleSeedDatabase}
              disabled={seeding}
              data-testid="seed-database-btn"
            >
              {seeding ? 'Initialisation...' : 'Initialiser les données de démo'}
            </Button>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          &copy; {new Date().getFullYear()} Déco Touché. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
