import { Phone } from 'lucide-react';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK } from '@/lib/utils';

export default function StickyCTA() {
  return (
    <a 
      href={CMGEORGES_PHONE_LINK}
      className="sticky-cta-mobile animate-pulse-gold"
      data-testid="sticky-cta-mobile"
    >
      <Phone className="h-5 w-5" />
      <span>Appeler {CMGEORGES_PHONE}</span>
    </a>
  );
}
