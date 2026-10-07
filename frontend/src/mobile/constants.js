const GOLD = 'bg-[#D4AF37]/15 text-[#E9C85A] border-[#D4AF37]/30';
const SKY = 'bg-sky-500/15 text-sky-300 border-sky-500/30';
const AMBER = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
const GREEN = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
const ROSE = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
const SLATE = 'bg-slate-500/15 text-slate-300 border-slate-500/30';

export const LEAD_STATUS = {
  new: { label: 'Nouveau', cls: GOLD },
  contacted: { label: 'Contacté', cls: SKY },
  quoted: { label: 'Soumis', cls: AMBER },
  won: { label: 'Gagné', cls: GREEN },
  lost: { label: 'Perdu', cls: ROSE },
};

export const PROJECT_STATUS = {
  pending: { label: 'En attente', cls: AMBER },
  in_progress: { label: 'En cours', cls: SKY },
  on_hold: { label: 'Suspendu', cls: SLATE },
  completed: { label: 'Terminé', cls: GREEN },
  cancelled: { label: 'Annulé', cls: ROSE },
};

export const INVOICE_STATUS = {
  draft: { label: 'Brouillon', cls: SLATE },
  sent: { label: 'Envoyée', cls: SKY },
  partial: { label: 'Partielle', cls: AMBER },
  paid: { label: 'Payée', cls: GREEN },
  overdue: { label: 'En retard', cls: ROSE },
  cancelled: { label: 'Annulée', cls: SLATE },
};

export const QUOTE_STATUS = {
  draft: { label: 'Brouillon', cls: SLATE },
  sent: { label: 'Envoyée', cls: SKY },
  accepted: { label: 'Acceptée', cls: GREEN },
  rejected: { label: 'Refusée', cls: ROSE },
};

export const CLIENT_STATUS = {
  active: { label: 'Actif', cls: GREEN },
  inactive: { label: 'Inactif', cls: SLATE },
};

export const SERVICE_TYPES = {
  manual: 'Peinture & Réno',
  furniture: 'Mobilier',
  tech: 'Tech / TV',
  'murs-accent': 'Murs d\'accent',
  demolition: 'Démolition',
};

export const PAYMENT_METHODS = {
  etransfer: 'Virement Interac',
  cash: 'Comptant',
  credit_card: 'Carte de crédit',
  cheque: 'Chèque',
  stripe: 'Stripe',
  wise: 'Wise',
  other: 'Autre',
};

export const money = (n) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(Number(n) || 0);

export const shortDate = (d) =>
  d ? new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : '—';

export const errMsg = (e, fallback = 'Une erreur est survenue') => {
  const d = e?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ');
  return fallback;
};
