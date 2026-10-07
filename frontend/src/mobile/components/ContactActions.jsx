import { Phone, MessageSquare, Mail, Navigation } from 'lucide-react';

const Action = ({ href, icon: Icon, label, testId, external }) => (
  <a
    href={href}
    data-testid={testId}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
    className={`flex flex-col items-center gap-1.5 rounded-2xl border border-[#1E293B] bg-[#111827] py-3 transition-transform active:scale-95 ${href ? '' : 'pointer-events-none opacity-30'}`}
  >
    <Icon className="h-5 w-5 text-[#D4AF37]" />
    <span className="text-[11px] font-medium text-slate-300">{label}</span>
  </a>
);

export const ContactActions = ({ phone, email, address }) => {
  const tel = phone ? phone.replace(/[^\d+]/g, '') : '';
  const maps = address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : '';
  return (
    <div className="grid grid-cols-4 gap-2" data-testid="m-contact-actions">
      <Action href={tel && `tel:${tel}`} icon={Phone} label="Appeler" testId="m-action-call" />
      <Action href={tel && `sms:${tel}`} icon={MessageSquare} label="Texto" testId="m-action-sms" />
      <Action href={email && `mailto:${email}`} icon={Mail} label="Courriel" testId="m-action-email" />
      <Action href={maps} icon={Navigation} label="GPS" testId="m-action-gps" external />
    </div>
  );
};

export const fullAddress = (o) => [o?.address, o?.city, o?.postal_code].filter(Boolean).join(', ');
