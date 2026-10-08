export const ACTION_KINDS = {
  call: 'Appel',
  sms: 'Texto',
  email: 'Courriel',
  message: 'Message (réseaux)',
  visit: 'Visite / estimation',
  followup: 'Relance',
  other: 'Autre',
};

export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfWeek = (d) => { const x = startOfDay(d); const wd = (x.getDay() + 6) % 7; return addDays(x, -wd); };
export const startOfMonth = (d) => { const x = startOfDay(d); x.setDate(1); return x; };
export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
export const dayKey = (d) => startOfDay(d).toISOString();

export const fmtDay = (d, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => new Intl.DateTimeFormat('fr-CA', opts).format(new Date(d));
export const fmtTime = (d) => new Intl.DateTimeFormat('fr-CA', { hour: '2-digit', minute: '2-digit' }).format(new Date(d));

export const toLocalInput = (d) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};

export const isOverdue = (a) => !a.done && new Date(a.due_at) < new Date();

// Groups agenda payload into { [dayKey]: [{type, at, ...}] }
export const groupByDay = (agenda) => {
  const out = {};
  const push = (at, ev) => { const k = dayKey(at); (out[k] = out[k] || []).push(ev); };
  (agenda?.projects || []).forEach((p) => push(p.scheduled_date, { type: 'project', at: p.scheduled_date, ...p }));
  (agenda?.actions || []).forEach((a) => push(a.due_at, { type: 'action', at: a.due_at, ...a }));
  Object.values(out).forEach((l) => l.sort((a, b) => new Date(a.at) - new Date(b.at)));
  return out;
};
