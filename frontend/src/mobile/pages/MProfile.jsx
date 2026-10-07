import { useState } from 'react';
import { ShieldCheck, ShieldOff, KeyRound } from 'lucide-react';
import { authApi } from '@/lib/api';
import { getCurrentUser } from '@/lib/utils';
import { MHeader, MCard, Section, Loading, MButton, Field, inputCls, KV } from '../components/MUi';
import { useLoad, useAction } from '../components/useLoad';

const PasswordCard = () => {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const { busy, run } = useAction();
  const save = async (e) => {
    e.preventDefault();
    if (await run('pw', () => authApi.changePassword(cur, next), 'Mot de passe modifié')) { setCur(''); setNext(''); }
  };
  return (
    <form onSubmit={save} className="space-y-3" data-testid="m-profile-password-form">
      <Field label="Mot de passe actuel"><input data-testid="m-profile-current-password" type="password" required className={inputCls} value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
      <Field label="Nouveau mot de passe (8+ caractères)"><input data-testid="m-profile-new-password" type="password" minLength={8} required className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
      <MButton type="submit" variant="ghost" data-testid="m-profile-password-submit" loading={busy === 'pw'} className="w-full"><KeyRound className="h-4 w-4" /> Changer le mot de passe</MButton>
    </form>
  );
};

const TwoFACard = () => {
  const { data: status, loading, reload } = useLoad(async () => (await authApi.get2FAStatus()).data);
  const { busy, run } = useAction();
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState(null);

  if (loading || !status) return <Loading />;
  const done = () => { setPw(''); setCode(''); setSetup(null); reload(); };

  if (status.enabled) {
    return (
      <div className="space-y-3" data-testid="m-2fa-enabled">
        <p className="flex items-center gap-2 text-sm text-emerald-300"><ShieldCheck className="h-4 w-4" /> 2FA activée ({status.method === 'totp' ? 'application' : 'courriel'})</p>
        <input data-testid="m-2fa-disable-password" type="password" placeholder="Mot de passe" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} />
        <input data-testid="m-2fa-disable-code" inputMode="numeric" placeholder="Code 2FA (application ou dernier code reçu)" className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} />
        <MButton variant="danger" data-testid="m-2fa-disable-btn" className="w-full" loading={busy === 'off'}
          onClick={async () => { if (await run('off', () => authApi.disable2FA(pw, code), '2FA désactivée')) done(); }}>
          <ShieldOff className="h-4 w-4" /> Désactiver la 2FA
        </MButton>
      </div>
    );
  }

  if (setup) {
    return (
      <div className="space-y-3 text-center" data-testid="m-2fa-totp-setup">
        <img src={setup.qr_code} alt="QR code 2FA" className="mx-auto h-44 w-44 rounded-xl bg-white p-2" />
        <p className="text-xs text-slate-400 break-all">Code manuel : <span className="font-mono text-slate-200">{setup.secret}</span></p>
        <input data-testid="m-2fa-totp-code" inputMode="numeric" maxLength={6} placeholder="Code à 6 chiffres" className={`${inputCls} text-center tracking-[0.4em] font-mono`} value={code} onChange={(e) => setCode(e.target.value)} />
        <MButton data-testid="m-2fa-totp-activate" className="w-full" loading={busy === 'totp'}
          onClick={async () => { if (await run('totp', () => authApi.activate2FATotp(code), '2FA activée')) done(); }}>Activer</MButton>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="m-2fa-disabled">
      <p className="text-sm text-slate-400">Protégez votre compte avec un second facteur.</p>
      <MButton data-testid="m-2fa-totp-start" className="w-full" loading={busy === 'setup'}
        onClick={async () => { const r = await run('setup', () => authApi.setup2FATotp()); if (r) setSetup(r.data); }}>
        <ShieldCheck className="h-4 w-4" /> Via application (Google Authenticator)
      </MButton>
      <input data-testid="m-2fa-email-password" type="password" placeholder="Mot de passe pour activer par courriel" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} />
      <MButton variant="ghost" data-testid="m-2fa-email-activate" className="w-full" loading={busy === 'email'}
        onClick={async () => { if (await run('email', () => authApi.activate2FAEmail(pw), '2FA par courriel activée')) done(); }}>Activer par courriel</MButton>
    </div>
  );
};

export default function MProfile() {
  const user = getCurrentUser();
  return (
    <div data-testid="m-profile-page">
      <MHeader back title="Mon profil" />
      <Section><MCard><KV k="Nom" v={user?.full_name || '—'} /><KV k="Courriel" v={<span className="break-all">{user?.email}</span>} /><KV k="Rôle" v={user?.role} /></MCard></Section>
      <Section title="Sécurité — 2FA"><MCard><TwoFACard /></MCard></Section>
      <Section title="Mot de passe"><MCard><PasswordCard /></MCard></Section>
    </div>
  );
}
