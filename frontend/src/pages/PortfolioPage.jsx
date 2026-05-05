import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious
} from '@/components/ui/carousel';
import { publicApi } from '@/lib/api';
import { getServiceLabel } from '@/lib/utils';

// Normalize an item's images into a list, with legacy fallback
const getItemImages = (item) => {
  if (Array.isArray(item.images) && item.images.length > 0) return item.images;
  const list = [];
  if (item.before_image_url) list.push(item.before_image_url);
  if (item.image_url) list.push(item.image_url);
  return list;
};

// Compute the badge label for a given image index inside the carousel
const getBadgeForIndex = (idx, total) => {
  if (total < 2) return null;
  if (idx === total - 1) return { label: 'Après', cls: 'bg-emerald-500 text-white' };
  if (idx === total - 2) return { label: 'Avant', cls: 'bg-amber-500 text-white' };
  return null;
};

function PortfolioCard({ item }) {
  const images = getItemImages(item);
  const total = images.length;

  return (
    <Card
      className="overflow-hidden hover-lift group"
      data-testid={`portfolio-item-${item.id}`}
    >
      <div className="relative">
        {total <= 1 ? (
          <div className="relative h-64 overflow-hidden">
            <img
              src={images[0] || ''}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => { e.target.src = 'https://placehold.co/600x400/1a365d/ffffff?text=Photo'; }}
            />
            <div className="absolute bottom-4 right-4 px-3 py-1 bg-[#1a365d] text-white rounded-full text-xs">
              {getServiceLabel(item.service_type)}
            </div>
          </div>
        ) : (
          <Carousel
            opts={{ loop: true, align: 'start' }}
            className="w-full"
            data-testid={`portfolio-carousel-${item.id}`}
          >
            <CarouselContent>
              {images.map((src, idx) => {
                const badge = getBadgeForIndex(idx, total);
                return (
                  <CarouselItem key={`${item.id}-${idx}`}>
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={src}
                        alt={`${item.title} - photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = 'https://placehold.co/600x400/1a365d/ffffff?text=Photo'; }}
                      />
                      {badge && (
                        <span
                          className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold shadow ${badge.cls}`}
                          data-testid={`portfolio-badge-${item.id}-${badge.label.toLowerCase()}`}
                        >
                          {badge.label}
                        </span>
                      )}
                      <div className="absolute bottom-4 right-4 px-3 py-1 bg-[#1a365d] text-white rounded-full text-xs">
                        {getServiceLabel(item.service_type)}
                      </div>
                      <span className="absolute bottom-4 left-4 px-2 py-0.5 rounded-full text-[11px] bg-black/60 text-white">
                        {idx + 1} / {total}
                      </span>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious
              className="left-2 bg-white/90 hover:bg-white text-[#1a365d]"
              data-testid={`portfolio-prev-${item.id}`}
            />
            <CarouselNext
              className="right-2 bg-white/90 hover:bg-white text-[#1a365d]"
              data-testid={`portfolio-next-${item.id}`}
            />
          </Carousel>
        )}
      </div>
      <CardContent className="p-6">
        <h3 className="font-semibold text-lg text-[#1a365d] mb-2 font-['Outfit']">
          {item.title}
        </h3>
        <p className="text-gray-600 text-sm">
          {item.description}
        </p>
      </CardContent>
    </Card>
  );
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await publicApi.getPortfolio();
        setPortfolio(response.data);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  const filteredPortfolio = activeTab === 'all'
    ? portfolio
    : portfolio.filter(item => item.service_type === activeTab);

  return (
    <div className="min-h-screen" data-testid="portfolio-page">
      {/* Header */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            Notre Portfolio
          </h1>
          <p className="text-white/80 max-w-2xl">
            Découvrez nos réalisations. Chaque projet présente plusieurs photos — les deux dernières correspondent à l'<strong>Avant</strong> et l'<strong>Après</strong>.
          </p>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="section-spacing bg-[#F8FAFC]">
        <div className="container-main">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-8 bg-white shadow-sm">
              <TabsTrigger value="all" data-testid="tab-all">Tous</TabsTrigger>
              <TabsTrigger value="manual" data-testid="tab-manual">Peinture & Rénovation</TabsTrigger>
              <TabsTrigger value="furniture" data-testid="tab-furniture">Mobilier</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="overflow-hidden animate-pulse">
                      <div className="h-64 bg-gray-200" />
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredPortfolio.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Aucun projet dans cette catégorie pour le moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredPortfolio.map((item) => (
                    <PortfolioCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
