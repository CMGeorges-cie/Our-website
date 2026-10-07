import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { authApi } from '@/lib/api';
import { setAuthData } from '@/lib/utils';
import { BRAND } from '@/config/brand';
import { MHead } from '../MobileLayout';
import { MButton, Field, inputCls } from '../components/MUi';
import { errMsg } from '../constants';
import '../mobile.css';

export default function MLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const finish = (d) => {
    setAuthData(d.access_token, d.user);
    toast.success('Connexion réussie');
    navigate(d.must_change_password ? '/m/profile' : '/m', { replace: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (challenge) {
        finish((await authApi.loginVerify2FA(challenge.challenge_token, otp)).data);
      } else {
        const d = (await authApi.loginChallenge(email, password)).data;
        if (d.challenge_required) {
          setChallenge(d);
          toast.info(d.method === 'email' ? 'Code envoyé par courriel' : 'Entrez le code de votre application');
        } else finish(d);
      }
    } catch (err) {
      toast.error(errMsg(err, challenge ? 'Code invalide' : 'Identifiants invalides'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="m-app min-h-screen bg-[#0B1120] text-white flex flex-col px-6 pt-[calc(4rem+env(safe-area-inset-top))] pb-10">
      <MHead />
      <div className="m-grain" />
      <div className="relative z-10 w-full max-w-sm mx-auto m-fade-in">
        <img src="/m-icon-512.png" alt={BRAND.name} className="h-20 w-20 rounded-3xl shadow-[0_20px_60px_-20px_rgba(212,175,55,0.5)]" />
        <h1 className="font-heading text-4xl font-bold tracking-tight mt-8">Gestion<br /><span className="text-[#D4AF37]">{BRAND.name}</span></h1>
        <p className="text-sm text-slate-400 mt-3">Votre entreprise dans votre poche — leads, chantiers, factures.</p>

        <form onSubmit={submit} className="mt-10 space-y-4" data-testid="m-login-form">
          {!challenge ? (
            <>
              <Field label="Courriel">
                <input data-testid="m-login-email" type="email" autoComplete="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Mot de passe">
                <input data-testid="m-login-password" type="password" autoComplete="current-password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            </>
          ) : (
            <div className="space-y-3" data-testid="m-login-2fa">
              <div className="flex items-center gap-2 text-sm text-[#E9C85A]">
                <ShieldCheck className="h-4 w-4" />
                {challenge.method === 'email' ? 'Code envoyé à votre courriel' : 'Code de votre application 2FA'}
              </div>
              <input data-testid="m-login-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus
                className={`${inputCls} text-center text-2xl tracking-[0.5em] h-14 font-mono`} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
              <button type="button" data-testid="m-login-2fa-cancel" onClick={() => { setChallenge(null); setOtp(''); }} className="text-xs text-slate-400 underline">
                Revenir
              </button>
            </div>
          )}
          <MButton data-testid="m-login-submit" type="submit" loading={loading} className="w-full h-14">
            {challenge ? 'Vérifier le code' : 'Se connecter'}
          </MButton>
        </form>
        <Link to="/mot-de-passe-oublie" className="block text-center text-xs text-slate-500 mt-6" data-testid="m-login-forgot">
          Mot de passe oublié ?
        </Link>
      </div>
    </div>
  );
}
