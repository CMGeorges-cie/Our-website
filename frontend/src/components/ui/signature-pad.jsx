import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Eraser, Check, PenTool, RotateCcw } from 'lucide-react';

/**
 * Signature Pad Component - Like Joist's signature capture
 * Can be used standalone or in a dialog
 */
export const SignaturePad = forwardRef(({ 
  onSave, 
  width = 500, 
  height = 200,
  penColor = '#d4af37',
  backgroundColor = '#1a1a2e'
}, ref) => {
  const sigCanvas = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useImperativeHandle(ref, () => ({
    clear: () => {
      sigCanvas.current?.clear();
      setIsEmpty(true);
    },
    getSignature: () => {
      if (sigCanvas.current?.isEmpty()) return null;
      return sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    },
    isEmpty: () => isEmpty
  }));

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const handleEnd = () => {
    setIsEmpty(sigCanvas.current?.isEmpty() ?? true);
  };

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signature = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      onSave?.(signature);
    }
  };

  return (
    <div className="space-y-4">
      {/* Canvas Container */}
      <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-gold-500/30 bg-background">
        <SignatureCanvas
          ref={sigCanvas}
          penColor={penColor}
          backgroundColor={backgroundColor}
          canvasProps={{
            width,
            height,
            className: 'signature-canvas w-full',
            style: { touchAction: 'none' }
          }}
          onEnd={handleEnd}
        />
        
        {/* Placeholder text when empty */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <PenTool className="h-8 w-8 mx-auto mb-2 text-gold-500/30" />
              <p className="text-muted-foreground text-sm">Signez ici</p>
            </div>
          </div>
        )}

        {/* Signature line */}
        <div className="absolute bottom-8 left-8 right-8 border-b border-muted-foreground/30" />
        <span className="absolute bottom-2 left-8 text-xs text-muted-foreground">Signature</span>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleClear}
          className="border-border"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Effacer
        </Button>
        
        {onSave && (
          <Button 
            type="button" 
            onClick={handleSave}
            disabled={isEmpty}
            className="bg-gold-500 hover:bg-gold-600 text-background"
          >
            <Check className="h-4 w-4 mr-2" />
            Valider la signature
          </Button>
        )}
      </div>
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';

/**
 * Signature Dialog - Full modal for signature capture
 */
export function SignatureDialog({ 
  open, 
  onOpenChange, 
  onSignatureComplete,
  title = "Signature électronique",
  description = "Veuillez signer dans le cadre ci-dessous pour valider ce document.",
  signerName = "",
  documentType = "document"
}) {
  const sigPadRef = useRef(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (sigPadRef.current?.isEmpty()) {
      return;
    }
    
    setSaving(true);
    try {
      const signature = sigPadRef.current.getSignature();
      if (signature) {
        await onSignatureComplete?.(signature);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error saving signature:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gold-500">
            <PenTool className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Legal text */}
          <div className="mb-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <p className="mb-2">
              En signant ce {documentType}, je confirme avoir lu et accepté les termes et conditions. 
              Cette signature électronique a la même valeur légale qu'une signature manuscrite.
            </p>
            {signerName && (
              <p className="font-medium text-foreground">
                Signataire: {signerName}
              </p>
            )}
            <p className="text-muted-foreground">
              Date: {new Date().toLocaleDateString('fr-CA')} à {new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Signature Pad */}
          <SignaturePad ref={sigPadRef} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-gold-500 hover:bg-gold-600 text-background"
          >
            {saving ? 'Enregistrement...' : 'Confirmer et signer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Signature Display - Shows a saved signature
 */
export function SignatureDisplay({ 
  signature, 
  signerName, 
  signedAt, 
  className = "" 
}) {
  if (!signature) return null;

  return (
    <div className={`bg-muted/30 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Signature électronique</p>
          <div className="bg-background rounded-lg p-2 border border-border">
            <img 
              src={signature} 
              alt="Signature" 
              className="max-h-20 mx-auto"
              style={{ filter: 'brightness(1.2)' }}
            />
          </div>
        </div>
        <div className="text-right text-sm">
          {signerName && (
            <p className="font-medium text-foreground">{signerName}</p>
          )}
          {signedAt && (
            <p className="text-muted-foreground text-xs">
              {new Date(signedAt).toLocaleDateString('fr-CA')}
              <br />
              {new Date(signedAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <div className="mt-2 flex items-center gap-1 text-green-400 text-xs">
            <Check className="h-3 w-3" />
            <span>Signé</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignaturePad;
