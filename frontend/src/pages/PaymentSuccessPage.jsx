import { useSearchParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    if (invoiceId && sessionId) {
      axios.get(`${BACKEND_URL}/api/v1/invoices/${invoiceId}/payment-status/${sessionId}`)
        .then(res => setStatus(res.data.payment_status === 'paid' ? 'paid' : 'pending'))
        .catch(() => setStatus('error'));
    }
  }, [invoiceId, sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" data-testid="payment-success">
      <Card className="max-w-md w-full border-0 shadow-xl">
        <CardContent className="p-8 text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_9d041269-feaf-4cbb-a5f7-16135f256136/artifacts/lzun575u_Logo%20officiel.svg" 
            alt="Déco Touché" className="h-10 mx-auto mb-6"
          />
          {status === 'checking' ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-[#d4af37] mx-auto mb-4" />
              <h2 className="text-xl font-bold text-[#1a365d]">Vérification du paiement...</h2>
            </>
          ) : status === 'paid' ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-[#1a365d] mb-2">Paiement reçu!</h2>
              <p className="text-gray-500 mb-6">
                Votre dépôt a été traité avec succès. Vous recevrez une confirmation par courriel.
                Merci pour votre confiance!
              </p>
              <Link to="/"><Button className="btn-accent">Retour à l'accueil</Button></Link>
            </>
          ) : (
            <>
              <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⏳</span>
              </div>
              <h2 className="text-xl font-bold text-[#1a365d] mb-2">Paiement en traitement</h2>
              <p className="text-gray-500 mb-6">
                Votre paiement est en cours de traitement. Vous recevrez une confirmation sous peu.
              </p>
              <Link to="/"><Button variant="outline">Retour à l'accueil</Button></Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
