import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowRight, CheckCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CMGEORGES_PHONE, CMGEORGES_PHONE_LINK } from '@/lib/utils';
import { CatalogPriceList, CatalogFromPrice } from '@/components/public/CatalogPricing';

const Hero = ({ icon: Icon, badge, title, accent, subtitle, image, soumission, categories }) => (
  <section className="relative py-24 overflow-hidden">
    <div className="absolute inset-0">
      <img src={image} alt={title} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1a365d]/95 to-[#1a365d]/55" />
    </div>
    <div className="container-main relative z-10 max-w-2xl">
      <span className="inline-flex items-center gap-2 bg-[#d4af37]/20 text-[#d4af37] px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
        <Icon className="h-4 w-4" /> {badge}
      </span>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 font-['Outfit']">{title} <span className="text-[#d4af37]">{accent}</span></h1>
      <p className="text-white/80 text-lg mb-4">{subtitle}</p>
      <p className="text-[#d4af37] font-semibold mb-8" data-testid="service-hero-price"><CatalogFromPrice categories={categories} /></p>
      <div className="flex flex-wrap gap-4">
        <Link to={soumission} data-testid="service-hero-quote-btn"><Button className="btn-accent text-lg px-8 py-6">Soumission gratuite <ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
        <a href={CMGEORGES_PHONE_LINK} data-testid="service-hero-call-btn"><Button variant="outline" className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-[#1a365d]"><Phone className="mr-2 h-5 w-5" /> {CMGEORGES_PHONE}</Button></a>
      </div>
    </div>
  </section>
);

const Features = ({ title, items }) => (
  <section className="section-spacing bg-white">
    <div className="container-main">
      <h2 className="text-3xl font-bold text-[#1a365d] text-center mb-12 font-['Outfit']">{title}</h2>
      <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {items.map((s, i) => (
          <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg" data-testid={`service-feature-${i}`}>
            <CheckCircle className="h-5 w-5 text-[#d4af37] flex-shrink-0" />
            <span className="text-gray-700 text-sm">{s}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Process = ({ steps }) => (
  <section className="section-spacing bg-white">
    <div className="container-main">
      <h2 className="text-3xl font-bold text-[#1a365d] text-center mb-12 font-['Outfit']">Comment ça se passe</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {steps.map((st, i) => (
          <div key={i} className="p-6 rounded-xl border border-gray-100 shadow-sm" data-testid={`service-step-${i}`}>
            <span className="text-3xl font-black text-[#d4af37] font-['Outfit']">0{i + 1}</span>
            <h3 className="font-bold text-[#1a365d] mt-2">{st.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{st.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const ServiceLanding = ({ testId, seo, hero, featuresTitle, features, categories, service, steps, soumission }) => {
  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute('content');
    meta?.setAttribute('content', seo.description);
    return () => { if (meta && prev) meta.setAttribute('content', prev); };
  }, [seo.description]);
  return (
  <div className="min-h-screen" data-testid={testId}>
    <Hero {...hero} soumission={soumission} categories={categories} />
    <Features title={featuresTitle} items={features} />
    <section className="section-spacing bg-gray-50">
      <div className="container-main">
        <h2 className="text-3xl font-bold text-[#1a365d] text-center mb-4 font-['Outfit']">Tarifs</h2>
        <p className="text-center text-gray-500 mb-8 text-sm">Prix à jour selon notre catalogue.</p>
        <CatalogPriceList categories={categories} service={service} testId={`${testId}-pricing`} />
      </div>
    </section>
    <Process steps={steps} />
    <section className="py-16 bg-[#1a365d]">
      <div className="container-main text-center">
        <h2 className="text-3xl font-bold text-white mb-6 font-['Outfit']">Prêt à planifier ?</h2>
        <Link to={soumission} data-testid={`${testId}-cta`}><Button className="btn-accent text-lg px-8 py-6">Demander une soumission <ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
      </div>
    </section>
  </div>
);
};
