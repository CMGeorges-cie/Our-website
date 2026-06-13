import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const fromClient = params.get('from') === 'client';
  const backTo = fromClient ? '/client/login' : '/admin/login';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Erreur. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4" data-testid="forgot-password-page">
      <Helmet><title>Mot de passe oublié · Déco Touché</title></Helmet>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1a365d] font-['Outfit']">Mot de passe oublié ?</CardTitle>
          <CardDescription>
            Entrez votre email. Si un compte existe, vous recevrez un lien sécurisé pour réinitialiser votre mot de passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center py-6" data-testid="forgot-password-sent">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-gray-700 mb-4">
                Si <strong>{email}</strong> est associé à un compte, vous recevrez un courriel dans quelques minutes.
              </p>
              <p className="text-sm text-gray-500">Le lien est valide pendant 60 minutes et ne peut être utilisé qu'une seule fois.</p>
              <Link to={backTo} className="inline-block mt-6">
                <Button variant="outline" data-testid="forgot-password-back-btn"><ArrowLeft className="h-4 w-4 mr-2" /> Retour à la connexion</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="pl-9"
                    data-testid="forgot-password-email-input"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a365d] hover:bg-[#1a365d]/90"
                data-testid="forgot-password-submit"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Envoyer le lien de réinitialisation
              </Button>
              <Link to={backTo} className="block text-center text-sm text-gray-500 hover:text-[#1a365d]">
                <ArrowLeft className="h-3 w-3 inline mr-1" /> Retour à la connexion
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
