import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi, clientPortalApi } from '@/lib/api';
import { setAuthData, isAuthenticated, getCurrentUser } from '@/lib/utils';
import { toast } from 'sonner';
import { LogIn, Users, Briefcase, ArrowLeft } from 'lucide-react';

const SERVICEFLOW_LOGO = "https://customer-assets.emergentagent.com/job_57c7ca12-f939-4f77-840a-6e3a2010ce9e/artifacts/xu0d6vd3_ChatGPT%20Image%20Mar%2011%2C%202026%2C%2011_52_31%20PM.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState(null); // 'admin' | 'client' | null
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      const user = getCurrentUser();
      if (user?.role === 'admin' || user?.role === 'staff') {
        navigate('/admin/dashboard');
      } else {
        navigate('/client/dashboard');
      }
    }
  }, [navigate]);

  // Vanta.js background
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
            color: 0xd4af37,
            backgroundColor: 0x1a365d,
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

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authApi.login(credentials.email, credentials.password);
      const user = response.data.user;
      setAuthData(response.data.access_token, user);
      toast.success('Connexion réussie!');
      
      // Redirect based on role
      if (user.role === 'admin' || user.role === 'staff') {
        navigate('/admin/dashboard');
      } else {
        navigate('/client/dashboard');
      }
    } catch (error) {
      toast.error('Identifiants invalides', {
        description: error.response?.data?.detail || 'Vérifiez votre email et mot de passe'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClientLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await clientPortalApi.login(credentials.email, credentials.password);
      // Store client token separately
      localStorage.setItem('client_token', response.data.access_token);
      localStorage.setItem('client_user', JSON.stringify(response.data.client));
      toast.success('Connexion réussie!');
      navigate('/client/dashboard');
    } catch (error) {
      toast.error('Identifiants invalides', {
        description: error.response?.data?.detail || 'Vérifiez votre email et mot de passe'
      });
    } finally {
      setLoading(false);
    }
  };

  // Selection screen
  if (!loginType) {
    return (
      <div ref={vantaRef} className="min-h-screen flex items-center justify-center p-4 relative" data-testid="login-page">
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-lg">
          {/* Logo */}
          <div className="text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-3 mb-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_cmgeorges-prod/artifacts/3w0w7gaw_logo_cmgeorges.svg" 
                alt="CMGeorges"
                className="h-14 w-auto brightness-0 invert"
              />
              <span className="text-3xl font-bold text-white font-['Outfit']">CMGeorges</span>
            </Link>
            <p className="text-white/60 text-sm">Choisissez votre espace de connexion</p>
          </div>

          {/* Login Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Admin/Staff Login */}
            <button
              onClick={() => setLoginType('admin')}
              className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 group"
              data-testid="select-admin-login"
            >
              <div className="w-16 h-16 bg-[#d4af37] rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Briefcase className="w-8 h-8 text-[#1a365d]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Administration</h3>
              <p className="text-white/60 text-sm">Accès employés et gestionnaires</p>
            </button>

            {/* Client Login */}
            <button
              onClick={() => setLoginType('client')}
              className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 group"
              data-testid="select-client-login"
            >
              <div className="w-16 h-16 bg-[#d4af37] rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-[#1a365d]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Portail Client</h3>
              <p className="text-white/60 text-sm">Accès à vos projets et factures</p>
            </button>
          </div>

          {/* Back to site */}
          <div className="text-center mt-8">
            <Link to="/" className="text-white/50 hover:text-white text-sm transition-colors inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour au site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div ref={vantaRef} className="min-h-screen flex items-center justify-center p-4 relative" data-testid="login-form-page">
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {loginType === 'admin' ? (
            <>
              <div className="flex items-center justify-center gap-3 mb-3">
                <img 
                  src={SERVICEFLOW_LOGO} 
                  alt="ServiceFlow" 
                  className="w-12 h-12 rounded-xl shadow-lg shadow-[#d4af37]/30"
                />
                <span className="text-3xl font-black text-white tracking-tight font-['Outfit']">
                  Service<span className="text-[#d4af37]">Flow</span>
                </span>
              </div>
              <p className="text-white/50 text-sm">Espace Administration</p>
            </>
          ) : (
            <>
              <Link to="/" className="inline-flex items-center gap-3 mb-3">
                <img 
                  src="https://customer-assets.emergentagent.com/job_cmgeorges-prod/artifacts/3w0w7gaw_logo_cmgeorges.svg" 
                  alt="CMGeorges"
                  className="h-12 w-auto brightness-0 invert"
                />
                <span className="text-2xl font-bold text-white font-['Outfit']">CMGeorges</span>
              </Link>
              <p className="text-white/50 text-sm">Portail Client</p>
            </>
          )}
        </div>

        {/* Login Card */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8">
          <form onSubmit={loginType === 'admin' ? handleAdminLogin : handleClientLogin} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-white/70 text-sm mb-1.5 block">Courriel</Label>
              <Input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                placeholder={loginType === 'admin' ? "admin@cmgeorges.com" : "votre@email.com"}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#d4af37] focus:ring-[#d4af37]/20"
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
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#d4af37] focus:ring-[#d4af37]/20"
                data-testid="login-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#d4af37] hover:bg-[#c9a432] text-[#1a365d] font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-[#d4af37]/20 hover:shadow-[#d4af37]/40 hover:scale-[1.01]"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#1a365d] border-t-transparent rounded-full animate-spin"></div>
                  Connexion...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Se connecter
                </span>
              )}
            </Button>
          </form>

          {/* Client registration link */}
          {loginType === 'client' && (
            <div className="mt-4 text-center">
              <Link to="/client/register" className="text-[#d4af37]/70 hover:text-[#d4af37] text-sm transition-colors">
                Pas encore de compte ? S'inscrire
              </Link>
            </div>
          )}

          {/* Back button */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <Button
              variant="ghost"
              className="w-full text-white/40 hover:text-white/60 hover:bg-white/5"
              onClick={() => {
                setLoginType(null);
                setCredentials({ email: '', password: '' });
              }}
              data-testid="back-to-selection-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Choisir un autre type de connexion
            </Button>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          © {new Date().getFullYear()} CMGeorges. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
