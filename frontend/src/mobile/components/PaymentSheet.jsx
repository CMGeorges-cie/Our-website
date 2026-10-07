import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { MButton, Field, inputCls } from './MUi';
import { BottomSheet } from './BottomSheet';
import { useAction } from './useLoad';
import { PAYMENT_METHODS, money } from '../constants';

export const PaymentSheet = ({ open, onOpenChange, invoice, onSaved }) => {
  const [amount, setAmount] = useState(String(invoice.balance_due || ''));
  const [method, setMethod] = useState('etransfer');
  const [notes, setNotes] = useState('');
  const { busy, run } = useAction();

  const save = async (e) => {
    e.preventDefault();
    const r = await run('pay', () => adminApi.recordPayment(invoice.id, { amount: parseFloat(amount), method, notes }), 'Paiement enregistré');
    if (r) { onSaved(); onOpenChange(false); }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Enregistrer un paiement" testId="m-payment-sheet">
      <form onSubmit={save} className="space-y-3">
        <p className="text-sm text-slate-400">Solde actuel : <b className="text-white">{money(invoice.balance_due)}</b></p>
        <Field label="Montant $"><input data-testid="m-payment-amount" required inputMode="decimal" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Méthode">
          <select data-testid="m-payment-method" className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Note"><input data-testid="m-payment-notes" className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <MButton type="submit" data-testid="m-payment-submit" loading={busy === 'pay'} className="w-full">Confirmer le paiement</MButton>
      </form>
    </BottomSheet>
  );
};
