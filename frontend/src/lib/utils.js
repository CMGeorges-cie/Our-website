import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format currency (CAD)
export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount);
}

// Format date
export function formatDate(date) {
  return new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

// Format date short
export function formatDateShort(date) {
  return new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

// Format phone number
export function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// Get status label in French
export function getStatusLabel(status) {
  const labels = {
    new: 'Nouveau',
    contacted: 'Contacté',
    quoted: 'Soumis',
    won: 'Gagné',
    lost: 'Perdu',
  };
  return labels[status] || status;
}

// Get service type label in French
export function getServiceLabel(type) {
  const labels = {
    manual: 'Peinture & Réno',
    furniture: 'Mobilier',
    entretien: 'Entretien',
  };
  return labels[type] || type;
}

// Get item type label in French
export function getItemTypeLabel(type) {
  const labels = {
    bed: 'Lit',
    dresser: 'Commode',
    desk: 'Bureau',
    wardrobe: 'Garde-robe',
    sofa: 'Sofa',
    table: 'Table',
    chair: 'Chaise',
    shelf: 'Étagère',
    other: 'Autre',
  };
  return labels[type] || type;
}

// Get brand label
export function getBrandLabel(brand) {
  const labels = {
    ikea: 'IKEA',
    jysk: 'JYSK',
    structube: 'Structube',
    wayfair: 'Wayfair',
    other: 'Autre',
  };
  return labels[brand] || brand;
}

// Get urgency label
export function getUrgencyLabel(level) {
  const labels = {
    normal: 'Normal',
    urgent: 'Urgent',
  };
  return labels[level] || level;
}

// Get source label
export function getSourceLabel(source) {
  const labels = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    google: 'Google',
    referral: 'Référence',
    other: 'Autre',
  };
  return labels[source] || source;
}

// Check if user is authenticated
export function isAuthenticated() {
  const token = localStorage.getItem('cmgeorges_token');
  return !!token;
}

// Get current user
export function getCurrentUser() {
  const user = localStorage.getItem('cmgeorges_user');
  return user ? JSON.parse(user) : null;
}

// Set auth data
export function setAuthData(token, user) {
  localStorage.setItem('cmgeorges_token', token);
  localStorage.setItem('cmgeorges_user', JSON.stringify(user));
}

// Clear auth data (clears localStorage; the backend cookie is cleared by calling /auth/logout)
export function clearAuthData() {
  localStorage.removeItem('cmgeorges_token');
  localStorage.removeItem('cmgeorges_user');
}

// Phone number for CMGeorges
// Backwards-compatible aliases — the canonical brand source is /src/config/brand.js
import { BRAND } from '@/config/brand';

export const CMGEORGES_PHONE = BRAND.phone.display;
export const CMGEORGES_PHONE_LINK = BRAND.phone.link;

// Brand assets — single source of truth for the official logo
export const DECOTOUCHE_LOGO_URL = BRAND.logoUrl;

