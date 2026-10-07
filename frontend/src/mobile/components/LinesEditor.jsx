import { Plus, Trash2 } from 'lucide-react';
import { inputCls } from './MUi';
import { money } from '../constants';

export const lineTotal = (lines) =>
  lines.reduce((s, l) => s + (parseInt(l.quantity, 10) || 0) * (parseFloat(l.unit_price) || 0), 0);

export const cleanLines = (lines) =>
  lines
    .filter((l) => l.description.trim())
    .map((l) => ({
      description: l.description.trim(),
      quantity: Math.max(1, parseInt(l.quantity, 10) || 1),
      unit_price: parseFloat(l.unit_price) || 0,
      line_type: l.line_type,
    }));

export const LinesEditor = ({ lines, setLines, types }) => {
  const update = (i, k, v) => setLines(lines.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const add = () => setLines([...lines, { description: '', quantity: 1, unit_price: '', line_type: types[0][0] }]);
  const remove = (i) => setLines(lines.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3" data-testid="m-lines-editor">
      {lines.map((l, i) => (
        <div key={i} className="rounded-2xl border border-[#1E293B] bg-[#111827] p-3 space-y-2" data-testid={`m-line-${i}`}>
          <div className="flex gap-2">
            <input
              data-testid={`m-line-desc-${i}`}
              className={inputCls}
              placeholder="Description"
              value={l.description}
              onChange={(e) => update(i, 'description', e.target.value)}
            />
            <button
              data-testid={`m-line-remove-${i}`}
              onClick={() => remove(i)}
              className="h-11 w-11 shrink-0 rounded-xl border border-[#1E293B] flex items-center justify-center text-rose-300 active:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-[64px_1fr_1fr] gap-2">
            <input data-testid={`m-line-qty-${i}`} className={inputCls} inputMode="numeric" value={l.quantity} onChange={(e) => update(i, 'quantity', e.target.value)} />
            <input data-testid={`m-line-price-${i}`} className={inputCls} inputMode="decimal" placeholder="Prix $" value={l.unit_price} onChange={(e) => update(i, 'unit_price', e.target.value)} />
            <select data-testid={`m-line-type-${i}`} className={inputCls} value={l.line_type} onChange={(e) => update(i, 'line_type', e.target.value)}>
              {types.map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
            </select>
          </div>
        </div>
      ))}
      <button
        data-testid="m-line-add"
        onClick={add}
        className="w-full h-11 rounded-xl border border-dashed border-[#D4AF37]/40 text-[#D4AF37] text-sm font-semibold flex items-center justify-center gap-2 active:bg-[#D4AF37]/10"
      >
        <Plus className="h-4 w-4" /> Ajouter une ligne
      </button>
      <div className="flex justify-between text-sm px-1 pt-1">
        <span className="text-slate-400">Sous-total (avant taxes)</span>
        <span className="font-bold text-white" data-testid="m-lines-subtotal">{money(lineTotal(lines))}</span>
      </div>
    </div>
  );
};
