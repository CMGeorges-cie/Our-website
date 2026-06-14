import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

/**
 * Pick a pending quote and convert it into a new invoice.
 */
export default function ConvertQuoteDialog({
  open,
  onOpenChange,
  pendingQuotes,
  clients,
  onConvert,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border text-foreground max-w-lg"
        data-testid="convert-quote-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-gold-500" />
            Convertir un devis en facture
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {pendingQuotes.map((quote) => {
            const client = clients.find((c) => c.id === quote.client_id);
            return (
              <div
                key={quote.id}
                className="flex items-center justify-between p-4 bg-background rounded-lg border border-border hover:border-gold-500/50 transition-colors cursor-pointer"
                onClick={() => onConvert(quote)}
                data-testid={`convert-quote-item-${quote.id}`}
              >
                <div>
                  <p className="font-medium text-foreground">
                    {quote.quote_number || `Devis #${quote.id.slice(0, 8)}`}
                  </p>
                  <p className="text-sm text-muted-foreground">{client?.full_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gold-500">
                    {formatCurrency(quote.total || 0)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
