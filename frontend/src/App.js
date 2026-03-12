import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";

// Pages
import HomePage from "@/pages/HomePage";
import ServicesPage from "@/pages/ServicesPage";
import MobilierPage from "@/pages/MobilierPage";
import PortfolioPage from "@/pages/PortfolioPage";
import SoumissionPage from "@/pages/SoumissionPage";
import ContactPage from "@/pages/ContactPage";
import FAQPage from "@/pages/FAQPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import GarantiePage from "@/pages/GarantiePage";
import SEOCityPage from "@/pages/SEOCityPage";
import BlogPage from "@/pages/BlogPage";
import BlogPostPage from "@/pages/BlogPostPage";
import ClientPortalPage from "@/pages/ClientPortalPage";

// Admin Pages
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLeads from "@/pages/admin/AdminLeads";
import AdminLeadDetail from "@/pages/admin/AdminLeadDetail";
import AdminQuoteView from "@/pages/admin/AdminQuoteView";
import AdminClients from "@/pages/admin/AdminClients";
import AdminInvoices from "@/pages/admin/AdminInvoices";
import AdminInvoiceDetail from "@/pages/admin/AdminInvoiceDetail";
import AdminProjects from "@/pages/admin/AdminProjects";
import AdminProjectDetail from "@/pages/admin/AdminProjectDetail";
import AdminRevenue from "@/pages/admin/AdminRevenue";

import AdminClientDetail from "@/pages/admin/AdminClientDetail";
import AdminBlog from "@/pages/admin/AdminBlog";
import AdminDiscounts from "@/pages/admin/AdminDiscounts";
import AdminPricing from "@/pages/admin/AdminPricing";
import AdminPolicies from "@/pages/admin/AdminPolicies";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminNotifications from "@/pages/admin/AdminNotifications";

// ServiceFlow / Client Portal
import ServiceFlowPricing from "@/pages/ServiceFlowPricing";
import ServiceFlowPage from "@/pages/ServiceFlowPage";
import ClientLogin from "@/pages/client/ClientLogin";
import ClientDashboard from "@/pages/client/ClientDashboard";
import LoginPage from "@/pages/LoginPage";

// Layout
import PublicLayout from "@/components/layout/PublicLayout";
import AdminLayout from "@/components/layout/AdminLayout";

// Analytics initialization
const initAnalytics = () => {
  const GA4_ID = process.env.REACT_APP_GA4_ID;
  const META_PIXEL_ID = process.env.REACT_APP_META_PIXEL_ID;

  // Google Analytics 4
  if (GA4_ID) {
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(script1);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA4_ID, {
      page_title: document.title,
      page_location: window.location.href
    });
  }

  // Meta Pixel
  if (META_PIXEL_ID) {
    !function(f,b,e,v,n,t,s) {
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)
    }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
    
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
};

// Track page views
export const trackPageView = (path, title) => {
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title
    });
  }
  if (window.fbq) {
    window.fbq('track', 'PageView');
  }
};

// Track events
export const trackEvent = (eventName, params = {}) => {
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
  if (window.fbq) {
    window.fbq('track', eventName, params);
  }
};

// Track lead submission
export const trackLeadSubmission = (serviceType) => {
  trackEvent('generate_lead', { service_type: serviceType });
  if (window.fbq) {
    window.fbq('track', 'Lead', { content_category: serviceType });
  }
};

function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <HelmetProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/mobilier" element={<MobilierPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/soumission" element={<SoumissionPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/confidentialite" element={<PrivacyPage />} />
              <Route path="/conditions" element={<TermsPage />} />
              <Route path="/garantie" element={<GarantiePage />} />
              
              {/* Blog */}
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              
              {/* SEO City Pages - Dynamic */}
              <Route path="/services/:city" element={<SEOCityPage />} />
              
              {/* SEO City Pages - Static for better SEO */}
              <Route path="/services-peinture-montreal" element={<SEOCityPage city="montreal" />} />
              <Route path="/services-peinture-longueuil" element={<SEOCityPage city="longueuil" />} />
              <Route path="/services-peinture-brossard" element={<SEOCityPage city="brossard" />} />
              <Route path="/services-peinture-laval" element={<SEOCityPage city="laval" />} />
              <Route path="/services-saint-laurent" element={<SEOCityPage city="ville-saint-laurent" />} />
            </Route>
            
            {/* Client Portal - No layout */}
            <Route path="/portail-client" element={<ClientPortalPage />} />
            
            {/* Unified Login Page */}
            <Route path="/connexion" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Client Portal - New */}
            <Route path="/client/login" element={<ClientLogin />} />
            <Route path="/client/register" element={<ClientLogin />} />
            <Route path="/client/dashboard" element={<ClientDashboard />} />
            <Route path="/client/projects" element={<ClientDashboard />} />
            <Route path="/client/invoices" element={<ClientDashboard />} />
            
            {/* ServiceFlow SaaS */}
            <Route path="/serviceflow" element={<ServiceFlowPage />} />
            <Route path="/serviceflow/pricing" element={<ServiceFlowPricing />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/leads" element={<AdminLeads />} />
              <Route path="/admin/leads/:id" element={<AdminLeadDetail />} />
              <Route path="/admin/quotes/:id" element={<AdminQuoteView />} />
              <Route path="/admin/clients" element={<AdminClients />} />
              <Route path="/admin/clients/:id" element={<AdminClientDetail />} />
              <Route path="/admin/invoices" element={<AdminInvoices />} />
              <Route path="/admin/invoices/:id" element={<AdminInvoiceDetail />} />
              <Route path="/admin/projects" element={<AdminProjects />} />
              <Route path="/admin/projects/:id" element={<AdminProjectDetail />} />
              <Route path="/admin/revenue" element={<AdminRevenue />} />
              <Route path="/admin/blog" element={<AdminBlog />} />
              <Route path="/admin/discounts" element={<AdminDiscounts />} />
              <Route path="/admin/pricing" element={<AdminPricing />} />
              <Route path="/admin/policies" element={<AdminPolicies />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/notifications" element={<AdminNotifications />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </HelmetProvider>
  );
}

export default App;
