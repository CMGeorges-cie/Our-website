import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Confirmation dialog for deleting an invoice.
 */
export default function DeleteInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onConfirm,
  saving,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border text-foreground max-w-md"
        data-testid="delete-invoice-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-red-400">Supprimer la facture</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">
          Êtes-vous sûr de vouloir supprimer la facture{' '}
          <strong className="text-foreground">{invoice?.invoice_number}</strong> ?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white"
            data-testid="confirm-delete-invoice"
          >
            {saving ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
