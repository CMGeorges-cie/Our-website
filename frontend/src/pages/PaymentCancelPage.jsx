import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" data-testid="payment-cancel">
      <Card className="max-w-md w-full border-0 shadow-xl">
        <CardContent className="p-8 text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_9d041269-feaf-4cbb-a5f7-16135f256136/artifacts/lzun575u_Logo%20officiel.svg" 
            alt="Déco Touché" className="h-10 mx-auto mb-6"
          />
          <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1a365d] mb-2">Paiement annulé</h2>
          <p className="text-gray-500 mb-6">
            Votre paiement n'a pas été traité. Aucun montant n'a été débité.
            Vous pouvez réessayer à tout moment.
          </p>
          <div className="flex flex-col gap-3">
            {invoiceId && (
              <Link to={`/paiement?invoice=${invoiceId}`}>
                <Button className="w-full btn-accent">Réessayer le paiement</Button>
              </Link>
            )}
            <Link to="/"><Button variant="outline" className="w-full">Retour à l'accueil</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
