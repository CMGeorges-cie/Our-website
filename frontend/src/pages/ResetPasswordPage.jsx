import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api';
import { Lock, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) toast.error('Lien de réinitialisation invalide');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pwd.length < 8) return toast.error('Le mot de passe doit faire au moins 8 caractères');
    if (pwd !== pwd2) return toast.error('Les deux mots de passe ne correspondent pas');
    setLoading(true);
    try {
      await authApi.resetPassword(token, pwd);
      toast.success('Mot de passe réinitialisé. Vous pouvez vous connecter.');
      navigate('/admin/login');
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4" data-testid="reset-password-page">
      <Helmet><title>Nouveau mot de passe · Déco Touché</title></Helmet>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1a365d] font-['Outfit']">Nouveau mot de passe</CardTitle>
          <CardDescription>Choisissez un nouveau mot de passe sécurisé pour votre compte.</CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="text-center py-6">
              <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <p className="text-gray-700">Lien invalide ou expiré.</p>
              <Link to="/mot-de-passe-oublie" className="inline-block mt-4">
                <Button variant="outline">Demander un nouveau lien</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pwd">Nouveau mot de passe</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="pwd" type="password" required minLength={8} value={pwd}
                    onChange={(e) => setPwd(e.target.value)} className="pl-9"
                    data-testid="reset-password-input" />
                </div>
              </div>
              <div>
                <Label htmlFor="pwd2">Confirmer le mot de passe</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="pwd2" type="password" required minLength={8} value={pwd2}
                    onChange={(e) => setPwd2(e.target.value)} className="pl-9"
                    data-testid="reset-password-confirm" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#1a365d] hover:bg-[#1a365d]/90"
                data-testid="reset-password-submit">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Mettre à jour mon mot de passe
              </Button>
              <Link to="/admin/login" className="block text-center text-sm text-gray-500 hover:text-[#1a365d]">
                <ArrowLeft className="h-3 w-3 inline mr-1" /> Retour à la connexion
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
