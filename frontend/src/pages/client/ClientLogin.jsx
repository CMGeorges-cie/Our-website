import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clientPortalApi } from '@/lib/api';
import { toast } from 'sonner';
import { LogIn, User } from 'lucide-react';
import { BRAND_LOGO_URL as SERVICEFLOW_LOGO } from '@/config/brand';

const CLIENT_TOKEN_KEY = 'sf_client_token';
const CLIENT_USER_KEY = 'sf_client_user';

export const setClientAuth = (token, user) => {
  localStorage.setItem(CLIENT_TOKEN_KEY, token);
  localStorage.setItem(CLIENT_USER_KEY, JSON.stringify(user));
};

export const getClientToken = () => localStorage.getItem(CLIENT_TOKEN_KEY);
export const isClientAuthenticated = () => !!getClientToken();
export const clearClientAuth = () => {
  localStorage.removeItem(CLIENT_TOKEN_KEY);
  localStorage.removeItem(CLIENT_USER_KEY);
};

export default function ClientLogin() {
  const navigate = useNavigate();
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [registerForm, setRegisterForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' });

  useEffect(() => {
    if (isClientAuthenticated()) navigate('/client/dashboard');
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
            THREE,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            color: 0xffe700,
            backgroundColor: 0x23153c,
            points: 10,
            maxDistance: 20,
            spacing: 15,
            showDots: true,
          });
        }
      } catch (e) {}
    };
    loadVanta();
    return () => {
      mounted = false;
      if (vantaEffect.current) { vantaEffect.current.destroy(); vantaEffect.current = null; }
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await clientPortalApi.login(form.email, form.password);
      setClientAuth(res.data.access_token, res.data.user);
      toast.success('Connexion réussie!');
      navigate('/client/dashboard');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Identifiants invalides');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (registerForm.password.length < 6) { toast.error('Mot de passe minimum 6 caractères'); return; }
    setLoading(true);
    try {
      const res = await clientPortalApi.register({ full_name: registerForm.full_name, email: registerForm.email, phone: registerForm.phone, password: registerForm.password });
      setClientAuth(res.data.access_token, res.data.user);
      toast.success('Compte créé avec succès!');
      navigate('/client/dashboard');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la création du compte');
    } finally { setLoading(false); }
  };

  return (
    <div ref={vantaRef} className="min-h-screen flex items-center justify-center p-4 relative" data-testid="client-login-page">
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
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
          <p className="text-white/50 text-sm tracking-wider uppercase">Portail Client</p>
        </div>

        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setTab('login')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'login' ? 'bg-yellow-400 text-[#23153c]' : 'text-white/50 hover:text-white'}`} data-testid="client-login-tab">Connexion</button>
            <button onClick={() => setTab('register')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'register' ? 'bg-yellow-400 text-[#23153c]' : 'text-white/50 hover:text-white'}`} data-testid="client-register-tab">Créer un compte</button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">Courriel</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="mon@email.com" required className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-yellow-400" data-testid="client-email-input" />
              </div>
              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">Mot de passe</Label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="••••••••" required className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-yellow-400" data-testid="client-password-input" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-yellow-400 hover:bg-yellow-300 text-[#23153c] font-bold py-3 rounded-xl" data-testid="client-login-submit">
                {loading ? 'Connexion...' : <span className="flex items-center justify-center gap-2"><LogIn className="h-4 w-4" />Se connecter</span>}
              </Button>
              <div className="text-center pt-1">
                <Link to="/mot-de-passe-oublie?from=client" className="text-white/60 hover:text-yellow-400 text-sm" data-testid="client-forgot-password-link">
                  Mot de passe oublié ?
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">Nom complet</Label>
                <Input value={registerForm.full_name} onChange={e => setRegisterForm(f => ({...f, full_name: e.target.value}))} placeholder="Jean Dupont" required className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-yellow-400" data-testid="register-name-input" />
              </div>
              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">Courriel</Label>
                <Input type="email" value={registerForm.email} onChange={e => setRegisterForm(f => ({...f, email: e.target.value}))} placeholder="mon@email.com" required className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-yellow-400" data-testid="register-email-input" />
              </div>
              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">Téléphone</Label>
                <Input value={registerForm.phone} onChange={e => setRegisterForm(f => ({...f, phone: e.target.value}))} placeholder="514-555-1234" className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-yellow-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70 text-sm mb-1.5 block">Mot de passe</Label>
                  <Input type="password" value={registerForm.password} onChange={e => setRegisterForm(f => ({...f, password: e.target.value}))} placeholder="••••••" required className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-yellow-400" data-testid="register-password-input" />
                </div>
                <div>
                  <Label className="text-white/70 text-sm mb-1.5 block">Confirmer</Label>
                  <Input type="password" value={registerForm.confirm} onChange={e => setRegisterForm(f => ({...f, confirm: e.target.value}))} placeholder="••••••" required className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-yellow-400" data-testid="register-confirm-input" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-yellow-400 hover:bg-yellow-300 text-[#23153c] font-bold py-3 rounded-xl" data-testid="register-submit-btn">
                {loading ? 'Création...' : <span className="flex items-center justify-center gap-2"><User className="h-4 w-4" />Créer mon compte</span>}
              </Button>
            </form>
          )}
        </div>
        <div className="text-center mt-4">
          <Link to="/admin/login" className="text-white/30 hover:text-white/50 text-xs transition-colors">← Accès administrateur</Link>
        </div>
      </div>
    </div>
  );
}
