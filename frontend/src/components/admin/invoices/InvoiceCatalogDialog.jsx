import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Package, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

/**
 * Catalog picker dialog used inside the invoice form to quickly add a
 * pre-priced service line.
 */
export default function InvoiceCatalogDialog({
  open,
  onOpenChange,
  services,
  search,
  onSearchChange,
  onPick,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border text-foreground max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        data-testid="invoice-catalog-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gold-500" />
            Catalogue de services
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un service..."
            className="pl-10 bg-background"
            data-testid="invoice-catalog-search"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between p-4 bg-background rounded-lg border border-border hover:border-gold-500/50 transition-colors cursor-pointer"
              onClick={() => onPick(service)}
              data-testid={`invoice-catalog-item-${service.id}`}
            >
              <div className="flex-1">
                <p className="font-medium text-foreground">{service.name}</p>
                <p className="text-sm text-muted-foreground">
                  {service.description?.substring(0, 60)}...
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gold-500">{formatCurrency(service.base_price)}</p>
                <p className="text-xs text-muted-foreground">{service.unit}</p>
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">Aucun service trouvé</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
