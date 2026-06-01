/**
 * Single source of truth for all Déco Touché brand information.
 *
 * Rule: NEVER hardcode brand-related strings (name, phone, email, taxes,
 * address, logo, social links, etc.) anywhere else in the frontend.
 * Always import from this file.
 *
 * Most values can be overridden via REACT_APP_* environment variables for
 * staging / multi-tenant deployments. Defaults below are the production
 * values for Déco Touché.
 */

const env = (key, fallback) => {
  const v = process.env[key];
  return v && v.length > 0 ? v : fallback;
};

const PHONE_DISPLAY = env('REACT_APP_BRAND_PHONE', '514-386-1743');
const PHONE_E164 = env('REACT_APP_BRAND_PHONE_E164', '+15143861743');

export const BRAND = {
  // Identity
  name: env('REACT_APP_BRAND_NAME', 'Déco Touché'),
  legalName: env('REACT_APP_BRAND_LEGAL_NAME', 'Déco Touché'),
  tagline: env(
    'REACT_APP_BRAND_TAGLINE',
    'Peinture intérieure et extérieure, rénovation légère et entretien général.'
  ),
  description: env(
    'REACT_APP_BRAND_DESCRIPTION',
    'Service professionnel de peinture, rénovation légère et entretien pour Montréal et la Rive-Sud.'
  ),

  // Contact
  email: env('REACT_APP_BRAND_EMAIL', 'cmgeorges.cie@gmail.com'),
  phone: {
    display: PHONE_DISPLAY,
    link: `tel:${PHONE_E164}`,
    e164: PHONE_E164,
  },

  // Location & service area
  address: env('REACT_APP_BRAND_ADDRESS', 'Montréal & Rive-Sud, QC'),
  serviceArea: env('REACT_APP_BRAND_SERVICE_AREA', 'Montréal et la Rive-Sud'),

  // Taxes (Quebec / Canada)
  taxes: {
    gst: env('REACT_APP_BRAND_TAX_GST', '714767027RT0001'),
    qst: env('REACT_APP_BRAND_TAX_QST', '4023795081TQ0001'),
  },

  // Visual assets
  logoUrl: env(
    'REACT_APP_BRAND_LOGO_URL',
    'https://customer-assets.emergentagent.com/job_9d041269-feaf-4cbb-a5f7-16135f256136/artifacts/lzun575u_Logo%20officiel.svg'
  ),

  // Social links (optional — leave empty string to hide)
  social: {
    instagram: env('REACT_APP_BRAND_INSTAGRAM', 'https://www.instagram.com/cmgeorges.decotouche/'),
    facebook: env('REACT_APP_BRAND_FACEBOOK', 'https://www.facebook.com/share/1G8H6hkjJQ/?mibextid=wwXIfr'),
    tiktok: env('REACT_APP_BRAND_TIKTOK', ''),
  },
};

// Convenience named exports (used widely)
export const BRAND_NAME = BRAND.name;
export const BRAND_EMAIL = BRAND.email;
export const BRAND_PHONE = BRAND.phone.display;
export const BRAND_PHONE_LINK = BRAND.phone.link;
export const BRAND_LOGO_URL = BRAND.logoUrl;
export const BRAND_TAX_GST = BRAND.taxes.gst;
export const BRAND_TAX_QST = BRAND.taxes.qst;
export const BRAND_ADDRESS = BRAND.address;
export const BRAND_SERVICE_AREA = BRAND.serviceArea;

export default BRAND;
