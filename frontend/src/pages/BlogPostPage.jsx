import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { blogApi } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { Calendar, Eye, ArrowLeft, Tag, User } from 'lucide-react';

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await blogApi.getPost(slug);
        setPost(response.data);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Article non trouvé');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  // Helper to get safe title for Helmet
  const getPageTitle = () => {
    if (!post) return 'Article | CMGeorges';
    const title = post.meta_title || post.title || 'Article';
    return String(title) + ' | CMGeorges';
  };

  const getPageDescription = () => {
    if (!post) return '';
    return String(post.meta_description || post.excerpt || '');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Helmet>
          <title>Chargement... | CMGeorges</title>
        </Helmet>
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Helmet>
          <title>Article non trouvé | CMGeorges</title>
        </Helmet>
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || 'Article non trouvé'}</p>
          <Link to="/blog">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="blog-post-page">
      <Helmet>
        <title>{getPageTitle()}</title>
        <meta name="description" content={getPageDescription()} />
      </Helmet>

      {/* Header */}
      <section className="bg-[#1a365d] py-16">
        <div className="container-main max-w-4xl">
          <Link to="/blog" className="inline-flex items-center text-white/70 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au blog
          </Link>
          
          <span className="inline-block px-3 py-1 bg-[#d4af37] text-[#1a365d] text-sm rounded-full mb-4 font-medium">
            {post.category}
          </span>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Outfit']">
            {post.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDateShort(post.published_at || post.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {post.author_name || 'CMGeorges'}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {post.view_count || 0} vues
            </span>
          </div>
        </div>
      </section>

      <section className="section-spacing">
        <div className="container-main max-w-4xl">
          <Card className="overflow-hidden">
            {post.featured_image && (
              <img 
                src={post.featured_image} 
                alt={post.title}
                className="w-full h-64 md:h-96 object-cover"
              />
            )}
            
            <CardContent className="p-6 md:p-10">
              {/* Excerpt */}
              <p className="text-lg text-gray-600 mb-8 pb-8 border-b border-gray-200 italic">
                {post.excerpt}
              </p>
              
              {/* Content */}
              <div 
                className="prose prose-lg max-w-none prose-headings:text-[#1a365d] prose-a:text-[#d4af37]"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
              
              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-500 mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, idx) => (
                      <span 
                        key={idx}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* CTA */}
          <Card className="mt-8 bg-[#1a365d]">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-4 font-['Outfit']">
                Besoin d'aide pour votre projet?
              </h3>
              <p className="text-white/80 mb-6">
                Notre équipe est prête à vous accompagner. Demandez une soumission gratuite!
              </p>
              <Link to="/soumission">
                <Button className="btn-accent" size="lg">
                  Demander une soumission
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
