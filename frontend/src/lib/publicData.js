import { useEffect, useState } from 'react';
import axios from 'axios';

const BASE = process.env.REACT_APP_BACKEND_URL;
const cache = {};

const load = (key, url) => {
  if (!cache[key]) cache[key] = axios.get(`${BASE}${url}`).then((r) => r.data).catch(() => { delete cache[key]; return null; });
  return cache[key];
};

const useCached = (key, url) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    load(key, url).then((d) => alive && setData(d));
    return () => { alive = false; };
  }, [key, url]);
  return data;
};

export const usePublicCatalog = () => useCached('catalog', '/api/v2/catalog/public');
export const useSiteSettings = () => useCached('settings', '/api/v1/site-settings');

const fmt = (n) => `${new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 2 }).format(n)} $`;
const UNIT_SKIP = ['forfait', 'projet', ''];

export const formatCatalogPrice = (item) => {
  const p = Number(item.base_price) || 0;
  if (!p) return 'Sur devis';
  const unit = (item.unit || '').trim();
  switch (item.pricing_type) {
    case 'hourly': return `${fmt(p)}/h`;
    case 'per_unit': return `${fmt(p)}/${unit || 'unité'}`;
    case 'quote': return item.show_from_price ? `À partir de ${fmt(p)}` : 'Sur devis';
    default: return UNIT_SKIP.includes(unit) ? fmt(p) : `${fmt(p)} / ${unit}`;
  }
};

export const itemsFor = (catalog, categories) => (catalog || []).filter((i) => categories.includes(i.category));

export const fromPriceLabel = (catalog, categories) => {
  const priced = itemsFor(catalog, categories).filter((i) => Number(i.base_price) > 0 && (i.pricing_type !== 'quote' || i.show_from_price));
  if (!priced.length) return 'Sur devis';
  const min = priced.reduce((a, b) => (Number(a.base_price) <= Number(b.base_price) ? a : b));
  const suffix = min.pricing_type === 'hourly' ? '/h' : min.pricing_type === 'per_unit' ? `/${min.unit}` : '';
  return `À partir de ${fmt(Number(min.base_price))}${suffix}`;
};

export const paymentTermsFor = (settings, service) => {
  const all = settings?.payment_terms || {};
  const t = all[service] || all.default;
  if (!t) return null;
  const steps = t.steps || [];
  return {
    steps,
    note: t.small_projects_note || '',
    summary: steps.map((s) => `${s.percent} % ${s.label}`).join(', '),
    deposit: steps[0] ? `${steps[0].percent} %` : '',
    short: steps.map((s) => s.percent).join('/'),
  };
};

export const SERVICE_LABELS = {
  default: 'Par défaut',
  painting: 'Peinture',
  renovation: 'Rénovation',
  furniture: 'Mobilier',
  accent_walls: "Murs d'accent",
  demolition: 'Démolition',
  maintenance: 'Entretien',
  hvac: 'Climatisation',
  installation: 'Installation TV',
  tech: 'Tech',
  other: 'Autre',
};
