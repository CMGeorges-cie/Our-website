import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { publicApi } from '@/lib/api';

export default function TermsPage() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await publicApi.getContentPage('terms');
        setPageData(response.data);
      } catch (error) {
        console.error('Error fetching terms page:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <section className="bg-[#1a365d] py-16">
          <div className="container-main">
            <div className="h-10 bg-gray-300 rounded animate-pulse mb-4"></div>
            <div className="h-6 bg-gray-300 rounded animate-pulse w-48"></div>
          </div>
        </section>
        <section className="section-spacing bg-white">
          <div className="container-main max-w-4xl">
            <div className="space-y-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <div className="h-8 bg-gray-200 rounded mb-4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Page non trouvée</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="terms-page">
      <Helmet>
        <title>{pageData.title} | CMGeorges</title>
        <meta name="description" content={pageData.meta_description} />
      </Helmet>

      {/* Header */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            {pageData.title}
          </h1>
          <p className="text-white/80">Dernière mise à jour: {pageData.last_updated}</p>
        </div>
      </section>

      {/* Content */}
      <section className="section-spacing bg-white">
        <div className="container-main max-w-4xl">
          <div dangerouslySetInnerHTML={{ __html: pageData.content }} />
        </div>
      </section>
    </div>
  );
}
