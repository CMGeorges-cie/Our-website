import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { authApi } from '@/lib/api';
import { Lock, Shield, Smartphone, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

function ChangePasswordCard() {
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [nw2, setNw2] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (nw.length < 8) return toast.error('Minimum 8 caractères');
    if (nw !== nw2) return toast.error('Les mots de passe ne correspondent pas');
    setLoading(true);
    try {
      await authApi.changePassword(cur, nw);
      toast.success('Mot de passe mis à jour');
      setCur(''); setNw(''); setNw2('');
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <Card className="bg-card border-border" data-testid="change-password-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Mot de passe</CardTitle>
        <CardDescription>Changez votre mot de passe administrateur.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Mot de passe actuel</Label>
            <Input type="password" required value={cur} onChange={(e) => setCur(e.target.value)}
              data-testid="cp-current" />
          </div>
          <div>
            <Label>Nouveau mot de passe</Label>
            <Input type="password" required minLength={8} value={nw} onChange={(e) => setNw(e.target.value)}
              data-testid="cp-new" />
          </div>
          <div>
            <Label>Confirmer</Label>
            <Input type="password" required minLength={8} value={nw2} onChange={(e) => setNw2(e.target.value)}
              data-testid="cp-confirm" />
          </div>
          <Button type="submit" disabled={loading} className="bg-gold-500 hover:bg-gold-600 text-background"
            data-testid="cp-submit">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Mettre à jour
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TwoFactorCard() {
  const [status, setStatus] = useState({ enabled: false, method: null });
  const [loading, setLoading] = useState(true);
  // setup state
  const [setupData, setSetupData] = useState(null);
  const [activateCode, setActivateCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // disable state
  const [showDisable, setShowDisable] = useState(false);
  const [disablePwd, setDisablePwd] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const refresh = async () => {
    try {
      const { data } = await authApi.get2FAStatus();
      setStatus(data);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const startTotp = async () => {
    setSubmitting(true);
    try {
      const { data } = await authApi.setup2FATotp();
      setSetupData(data);
    } catch (err) {
      toast.error('Erreur lors de la génération du QR code');
    } finally { setSubmitting(false); }
  };

  const activateTotp = async () => {
    if (activateCode.length < 6) return toast.error('Entrez le code à 6 chiffres');
    setSubmitting(true);
    try {
      await authApi.activate2FATotp(activateCode);
      toast.success('2FA TOTP activée');
      setSetupData(null);
      setActivateCode('');
      refresh();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Code invalide');
    } finally { setSubmitting(false); }
  };

  const activateEmail = async () => {
    setSubmitting(true);
    try {
      await authApi.activate2FAEmail();
      toast.success('2FA par email activée');
      refresh();
    } catch (err) {
      toast.error('Erreur');
    } finally { setSubmitting(false); }
  };

  const disable = async () => {
    if (!disablePwd || !disableCode) return toast.error('Mot de passe et code requis');
    setSubmitting(true);
    try {
      await authApi.disable2FA(disablePwd, disableCode);
      toast.success('2FA désactivée');
      setShowDisable(false);
      setDisablePwd(''); setDisableCode('');
      refresh();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Échec');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Card><CardContent className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></CardContent></Card>;

  return (
    <Card className="bg-card border-border" data-testid="two-factor-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Double authentification (2FA)</CardTitle>
        <CardDescription>
          Sécurisez votre compte avec un code à usage unique en plus du mot de passe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.enabled ? (
          <>
            <div className="flex items-start gap-3 p-3 bg-emerald-500/10 rounded border border-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">2FA activée</p>
                <p className="text-sm text-muted-foreground">
                  Méthode : <strong>{status.method === 'totp' ? 'Application TOTP (Google Authenticator)' : 'Code par email'}</strong>
                </p>
              </div>
            </div>
            {!showDisable ? (
              <Button variant="outline" onClick={() => setShowDisable(true)} data-testid="disable-2fa-btn">
                Désactiver la 2FA
              </Button>
            ) : (
              <div className="space-y-3 p-4 border border-border rounded">
                <p className="text-sm text-amber-500 flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5" />Confirmez votre mot de passe et un code 2FA valide pour désactiver.</p>
                <Input type="password" placeholder="Mot de passe actuel" value={disablePwd} onChange={(e) => setDisablePwd(e.target.value)} data-testid="disable-pwd" />
                <Input placeholder="Code 2FA (6 chiffres)" value={disableCode} onChange={(e) => setDisableCode(e.target.value)} data-testid="disable-code" />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowDisable(false)}>Annuler</Button>
                  <Button variant="destructive" onClick={disable} disabled={submitting} data-testid="disable-confirm">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Désactiver
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : setupData ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scannez ce QR code avec Google Authenticator, Authy ou 1Password, puis entrez le code à 6 chiffres affiché.
            </p>
            <div className="flex justify-center p-4 bg-white rounded">
              <img src={setupData.qr_code} alt="QR code TOTP" className="w-48 h-48" />
            </div>
            <div className="text-xs text-muted-foreground break-all">
              <span className="font-semibold">Code manuel :</span> {setupData.secret}
            </div>
            <Input placeholder="Code à 6 chiffres" value={activateCode} onChange={(e) => setActivateCode(e.target.value)} data-testid="activate-code" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setSetupData(null); setActivateCode(''); }}>Annuler</Button>
              <Button onClick={activateTotp} disabled={submitting} className="bg-gold-500 hover:bg-gold-600 text-background" data-testid="activate-totp-btn">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Activer
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button onClick={startTotp} disabled={submitting}
              className="text-left p-4 rounded-lg border border-border hover:border-gold-500 hover:bg-gold-500/5 transition-colors"
              data-testid="enable-totp">
              <Smartphone className="h-6 w-6 text-gold-500 mb-2" />
              <p className="font-medium text-foreground">App d'authentification</p>
              <p className="text-xs text-muted-foreground">QR code Google Authenticator / Authy</p>
            </button>
            <button onClick={activateEmail} disabled={submitting}
              className="text-left p-4 rounded-lg border border-border hover:border-gold-500 hover:bg-gold-500/5 transition-colors"
              data-testid="enable-email-2fa">
              <Mail className="h-6 w-6 text-gold-500 mb-2" />
              <p className="font-medium text-foreground">Code par email</p>
              <p className="text-xs text-muted-foreground">Code 6 chiffres envoyé à chaque connexion</p>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminProfile() {
  return (
    <div className="space-y-6" data-testid="admin-profile">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mon profil & Sécurité</h1>
        <p className="text-muted-foreground">Gérez votre mot de passe et la double authentification.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChangePasswordCard />
        <TwoFactorCard />
      </div>
    </div>
  );
}
