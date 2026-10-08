import { Phone, MessageSquare, Mail, Navigation } from 'lucide-react';

const Action = ({ href, icon: Icon, label, testId, external }) => (
  <a
    href={href || undefined}
    aria-disabled={!href}
    data-testid={testId}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
    className={`flex flex-col items-center gap-1.5 rounded-2xl border border-[#1E293B] bg-[#111827] py-3 transition-transform active:scale-95 ${href ? '' : 'pointer-events-none opacity-30'}`}
  >
    <Icon className="h-5 w-5 text-[#D4AF37]" />
    <span className="text-[11px] font-medium text-slate-300">{label}</span>
  </a>
);

const PLACEHOLDER_TXT = /(example\.|placeholder|inconnu|unknown|noemail|no-email|aucun|a[-_ ]?confirmer|à confirmer|tbd|n\/a|@temp|@test\.)/i;

export const validPhone = (p) => {
  const d = (p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 && !/^(\d)\1+$/.test(d) && !/^\d{3}555\d{4}$/.test(d) && d !== '1234567890';
};
export const validEmail = (e) => !!e && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e) && !PLACEHOLDER_TXT.test(e);
export const validAddress = (a) => !!a && a.replace(/[\s,]/g, '').length > 5 && !PLACEHOLDER_TXT.test(a);

export const ContactActions = ({ phone, email, address, channels, preferred }) => {
  const okPhone = validPhone(phone);
  const tel = okPhone ? phone.replace(/[^\d+]/g, '') : '';
  const okEmail = validEmail(email);
  const maps = validAddress(address) ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : '';
  const missing = [!okPhone && 'téléphone', !okEmail && 'courriel', !maps && 'adresse'].filter(Boolean);
  return (
    <>
    {missing.length > 0 && (
      <p className="text-[11px] text-amber-300/90 mb-2" data-testid="m-contact-missing">Coordonnées à compléter : {missing.join(', ')}</p>
    )}
    <div className="grid grid-cols-4 gap-2" data-testid="m-contact-actions">
      <Action href={tel && `tel:${tel}`} icon={Phone} label="Appeler" testId="m-action-call" />
      <Action href={tel && `sms:${tel}`} icon={MessageSquare} label="Texto" testId="m-action-sms" />
      <Action href={okEmail && `mailto:${email}`} icon={Mail} label="Courriel" testId="m-action-email" />
      <Action href={maps} icon={Navigation} label="GPS" testId="m-action-gps" external />
    </div>
    <ChannelLinks channels={channels} preferred={preferred} phone={phone} />
    </>
  );
};

export const fullAddress = (o) => [o?.address, o?.city, o?.postal_code].filter(Boolean).join(', ');

export const CHANNELS = {
  whatsapp: { label: 'WhatsApp', hint: 'Numéro', url: (v) => `https://wa.me/${toIntl(v)}` },
  signal: { label: 'Signal', hint: 'Numéro', url: (v) => `https://signal.me/#p/+${toIntl(v)}` },
  instagram: { label: 'Instagram', hint: '@utilisateur', url: (v) => `https://instagram.com/${handle(v)}` },
  messenger: { label: 'Messenger', hint: 'utilisateur', url: (v) => `https://m.me/${handle(v)}` },
  snapchat: { label: 'Snapchat', hint: '@utilisateur', url: (v) => `https://snapchat.com/add/${handle(v)}` },
  tiktok: { label: 'TikTok', hint: '@utilisateur', url: (v) => `https://www.tiktok.com/@${handle(v)}` },
};
const toIntl = (v) => { const d = (v || '').replace(/\D/g, ''); return d.length === 10 ? `1${d}` : d; };
const handle = (v) => (v || '').trim().replace(/^@/, '');
const channelUrl = (k, v) => (/^https?:\/\//.test(v) ? v : CHANNELS[k].url(v));

const ChannelLinks = ({ channels, preferred, phone }) => {
  const list = Object.entries(channels || {}).filter(([k, v]) => CHANNELS[k] && v?.trim());
  if (!list.length && !preferred) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2" data-testid="m-channel-links">
      {preferred && <span className="text-[11px] text-slate-400 self-center" data-testid="m-preferred-channel">Préfère : <b className="text-[#E9C85A]">{CHANNELS[preferred]?.label || { phone: 'Téléphone', sms: 'Texto', email: 'Courriel' }[preferred] || preferred}</b></span>}
      {list.map(([k, v]) => (
        <a key={k} href={channelUrl(k, v === 'phone' ? phone : v)} target="_blank" rel="noopener noreferrer" data-testid={`m-channel-${k}`}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold active:scale-95 transition-transform ${preferred === k ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#E9C85A]' : 'border-[#1E293B] bg-[#111827] text-slate-200'}`}>
          {CHANNELS[k].label}
        </a>
      ))}
    </div>
  );
};
