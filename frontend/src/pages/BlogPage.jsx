import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { blogApi } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { Calendar, Eye, ArrowRight, Tag } from 'lucide-react';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, categoriesRes] = await Promise.all([
          blogApi.getPosts({ category: selectedCategory, limit: 20 }),
          blogApi.getCategories()
        ]);
        setPosts(postsRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Error fetching blog data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedCategory]);

  const getCategoryLabel = (cat) => {
    const labels = {
      conseils: 'Conseils',
      guides: 'Guides',
      actualites: 'Actualités',
      general: 'Général'
    };
    return labels[cat] || cat;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="blog-page">
      <Helmet>
        <title>Blog | Déco Touché - Conseils et Guides</title>
        <meta name="description" content="Découvrez nos conseils, guides et actualités sur la peinture, l'assemblage de meubles et les services tech." />
      </Helmet>

      {/* Header */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            Blog Déco Touché
          </h1>
          <p className="text-white/80 max-w-2xl">
            Conseils pratiques, guides détaillés et actualités pour tous vos projets de rénovation et technologie.
          </p>
        </div>
      </section>

      <section className="section-spacing">
        <div className="container-main">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - Categories */}
            <aside className="lg:w-64 flex-shrink-0">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-[#1a365d] mb-4">Catégories</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        !selectedCategory ? 'bg-[#d4af37] text-[#1a365d] font-medium' : 'hover:bg-gray-100'
                      }`}
                      data-testid="category-all"
                    >
                      Tous les articles
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.category}
                        onClick={() => setSelectedCategory(cat.category)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex justify-between items-center ${
                          selectedCategory === cat.category ? 'bg-[#d4af37] text-[#1a365d] font-medium' : 'hover:bg-gray-100'
                        }`}
                        data-testid={`category-${cat.category}`}
                      >
                        <span>{getCategoryLabel(cat.category)}</span>
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">{cat.count}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* Posts Grid */}
            <main className="flex-1">
              {loading ? (
                <div className="text-center py-12 text-gray-500">Chargement...</div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Aucun article trouvé</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {posts.map((post) => (
                    <Card key={post.id} className="overflow-hidden hover-lift" data-testid={`blog-post-${post.slug}`}>
                      {post.featured_image && (
                        <img 
                          src={post.featured_image} 
                          alt={post.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateShort(post.published_at || post.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {post.view_count || 0} vues
                          </span>
                        </div>
                        
                        <span className="inline-block px-2 py-1 bg-[#1a365d]/10 text-[#1a365d] text-xs rounded-full mb-3">
                          {getCategoryLabel(post.category)}
                        </span>
                        
                        <h2 className="text-xl font-semibold text-[#1a365d] mb-2 font-['Outfit']">
                          {post.title}
                        </h2>
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                        
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="flex items-center gap-1 text-xs text-gray-500">
                                <Tag className="h-3 w-3" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <Link to={`/blog/${post.slug}`}>
                          <Button variant="outline" className="w-full">
                            Lire l'article
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}
