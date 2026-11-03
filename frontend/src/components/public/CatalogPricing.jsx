import { Clock } from 'lucide-react';
import { usePublicCatalog, useSiteSettings, itemsFor, formatCatalogPrice, paymentTermsFor, fromPriceLabel } from '@/lib/publicData';

export const PaymentTermsNote = ({ service, className = 'text-center text-xs text-gray-400 mt-6', prefix = '* TPS et TVQ en sus.' }) => {
  const t = paymentTermsFor(useSiteSettings(), service);
  if (!t) return null;
  return (
    <p className={className} data-testid={`payment-terms-${service}`}>
      {prefix} Modalités de paiement : {t.summary}.{t.note ? ` ${t.note}` : ''}
    </p>
  );
};

export const CatalogPriceList = ({ categories, service, testId = 'catalog-price-list' }) => {
  const catalog = usePublicCatalog();
  const items = itemsFor(catalog, categories);
  return (
    <div data-testid={testId}>
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {catalog === null && [0, 1].map((i) => <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />)}
        {catalog !== null && items.length === 0 && (
          <div className="md:col-span-2 flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <p className="font-semibold text-[#1a365d] text-sm">Tarification personnalisée</p>
            <span className="font-extrabold text-[#1a365d] text-base">Sur devis</span>
          </div>
        )}
        {items.map((it) => (
          <div key={it.id} className="flex justify-between items-center gap-4 p-4 bg-gray-50 rounded-lg" data-testid={`catalog-item-${it.id}`}>
            <div className="min-w-0">
              <p className="font-semibold text-[#1a365d] text-sm">{it.name}</p>
              {it.estimated_duration && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> {it.estimated_duration}</p>
              )}
            </div>
            <span className="font-extrabold text-[#1a365d] text-base text-right whitespace-nowrap">{formatCatalogPrice(it)}</span>
          </div>
        ))}
      </div>
      <PaymentTermsNote service={service || categories[0]} />
    </div>
  );
};

export const CatalogFromPrice = ({ categories }) => {
  const catalog = usePublicCatalog();
  return <span data-testid={`from-price-${categories.join('-')}`}>{catalog === null ? '…' : fromPriceLabel(catalog, categories)}</span>;
};
