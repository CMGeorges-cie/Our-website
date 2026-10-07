import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Search, WifiOff, LockKeyhole } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MHeader = ({ title, subtitle, back, action }) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 m-fade-in">
      <div className="flex items-start gap-2 min-w-0">
        {back && (
          <button
            data-testid="m-back-btn"
            onClick={() => navigate(-1)}
            className="-ml-2 mt-0.5 h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-slate-300 active:bg-white/10"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-white truncate" data-testid="m-page-title">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
};

export const Pill = ({ map, value, testId }) => {
  const s = map[value] || { label: value, cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' };
  return (
    <span data-testid={testId} className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', s.cls)}>
      {s.label}
    </span>
  );
};

export const MCard = ({ className, children, onClick, testId }) => (
  <div
    data-testid={testId}
    onClick={onClick}
    className={cn(
      'rounded-2xl border border-[#1E293B] bg-[#111827] p-4 transition-transform duration-150',
      onClick && 'active:scale-[0.98] cursor-pointer',
      className
    )}
  >
    {children}
  </div>
);

export const ListRow = ({ title, subtitle, right, onClick, testId }) => (
  <MCard onClick={onClick} testId={testId} className="flex items-center gap-3 py-3.5">
    <div className="min-w-0 flex-1">
      <p className="text-[15px] font-semibold text-white truncate">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
    </div>
    {right}
    {onClick && <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />}
  </MCard>
);

export const Section = ({ title, children, action }) => (
  <section className="px-5 mb-6">
    {(title || action) && (
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">{title}</h2>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const Loading = () => (
  <div className="flex justify-center py-16" data-testid="m-loading">
    <Loader2 className="h-7 w-7 animate-spin text-[#D4AF37]" />
  </div>
);

export const Empty = ({ text }) => (
  <div className="text-center py-12 text-sm text-slate-500" data-testid="m-empty">{text}</div>
);

export const SearchBar = ({ value, onChange, placeholder = 'Rechercher…' }) => (
  <div className="relative">
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
    <input
      data-testid="m-search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-11 rounded-xl bg-[#111827] border border-[#1E293B] pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37]/60"
    />
  </div>
);

export const Chips = ({ options, value, onChange, testPrefix }) => (
  <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
    {options.map(([key, label]) => (
      <button
        key={key}
        data-testid={`${testPrefix}-${key || 'all'}`}
        onClick={() => onChange(key)}
        className={cn(
          'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors',
          value === key
            ? 'bg-[#D4AF37] text-[#0B1120] border-[#D4AF37]'
            : 'bg-transparent text-slate-300 border-[#1E293B] active:bg-white/5'
        )}
      >
        {label}
      </button>
    ))}
  </div>
);

export const MButton = ({ variant = 'gold', className, children, loading, ...props }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-xl h-12 px-4 text-sm font-semibold transition-[transform,background-color,opacity] active:scale-[0.97] disabled:opacity-50',
      variant === 'gold' && 'bg-[#D4AF37] text-[#0B1120] active:bg-[#B8972E]',
      variant === 'ghost' && 'bg-white/5 text-white border border-[#1E293B] active:bg-white/10',
      variant === 'danger' && 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
      className
    )}
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </button>
);

export const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-medium text-slate-400 mb-1.5">{label}</span>
    {children}
  </label>
);

export const inputCls =
  'w-full h-11 rounded-xl bg-[#0B1120] border border-[#1E293B] px-3 text-[15px] text-white placeholder:text-slate-600 focus:outline-none focus:border-[#D4AF37]/60';

export const KV = ({ k, v, strong }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <span className="text-slate-400">{k}</span>
    <span className={cn('text-right', strong ? 'text-white font-bold' : 'text-slate-200')}>{v}</span>
  </div>
);

export const LoadError = ({ error, onRetry }) => {
  const navigate = useNavigate();
  const expired = error?.response?.status === 401;
  const offline = !error?.response;
  const Icon = expired ? LockKeyhole : WifiOff;
  return (
    <div className="mx-5 my-8 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center" data-testid="m-load-error">
      <Icon className="h-7 w-7 text-rose-300 mx-auto" />
      <p className="text-white font-semibold mt-3" data-testid="m-load-error-title">
        {expired ? 'Session expirée' : offline ? 'Connexion impossible' : 'Chargement impossible'}
      </p>
      <p className="text-xs text-slate-400 mt-1">
        {expired ? 'Reconnectez-vous pour voir vos données.' : offline ? 'Vérifiez votre réseau puis réessayez.' : 'Une erreur est survenue côté serveur.'}
      </p>
      <MButton
        data-testid="m-load-error-action"
        className="mt-4 w-full"
        onClick={() => (expired ? navigate('/m/login?expired=1', { replace: true }) : onRetry?.())}
      >
        {expired ? 'Se reconnecter' : 'Réessayer'}
      </MButton>
    </div>
  );
};
