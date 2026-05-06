import { Phone } from 'lucide-react';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK } from '@/lib/utils';

export default function StickyCTA() {
  return (
    <a
      href={CMGEORGES_PHONE_LINK}
      data-testid="sticky-cta-mobile"
      aria-label={`Appeler ${CMGEORGES_PHONE}`}
      className="
        lg:hidden no-print
        fixed bottom-4 left-1/2 -translate-x-1/2 z-40
        inline-flex items-center justify-center gap-2
        h-12 px-6
        rounded-full
        bg-[#d4af37] hover:bg-[#c19b2c] active:bg-[#b08a25]
        text-[#1a365d] font-semibold text-sm
        shadow-lg shadow-black/20
        ring-1 ring-black/5
        transition-all duration-200
        hover:scale-105 hover:shadow-xl
      "
    >
      <Phone className="h-4 w-4" />
      <span className="whitespace-nowrap">Appeler {CMGEORGES_PHONE}</span>
    </a>
  );
}
