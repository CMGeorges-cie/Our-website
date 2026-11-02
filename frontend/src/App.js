import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";

// Pages
import HomePage from "@/pages/HomePage";
import ServicesPage from "@/pages/ServicesPage";
import PeinturePage from "@/pages/PeinturePage";
import RenovationPage from "@/pages/RenovationPage";
import EntretienPage from "@/pages/EntretienPage";
import ClimatiseursPage from "@/pages/ClimatiseursPage";
import TvTechPage from "@/pages/TvTechPage";
import PaymentPage from "@/pages/PaymentPage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import PaymentCancelPage from "@/pages/PaymentCancelPage";
import PublicInvoicePaymentPage from "@/pages/PublicInvoicePaymentPage";
import MobilierPage from "@/pages/MobilierPage";
import DecorationPage from "@/pages/DecorationPage";
import MursAccentPage from "@/pages/MursAccentPage";
import PortfolioPage from "@/pages/PortfolioPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import AdminProfile from "@/pages/admin/AdminProfile";
import AdminSiteSettings from "@/pages/admin/AdminSiteSettings";
// Mobile management PWA
import MobileLayout from "@/mobile/MobileLayout";
import MLogin from "@/mobile/pages/MLogin";
import MDashboard from "@/mobile/pages/MDashboard";
import MLeads from "@/mobile/pages/MLeads";
import MLeadDetail from "@/mobile/pages/MLeadDetail";
import MQuoteCreate from "@/mobile/pages/MQuoteCreate";
import MQuotes from "@/mobile/pages/MQuotes";
import MQuoteDetail from "@/mobile/pages/MQuoteDetail";
import MClients from "@/mobile/pages/MClients";
import MClientDetail from "@/mobile/pages/MClientDetail";
import MProjects from "@/mobile/pages/MProjects";
import MProjectDetail from "@/mobile/pages/MProjectDetail";
import MInvoices from "@/mobile/pages/MInvoices";
import MInvoiceCreate from "@/mobile/pages/MInvoiceCreate";
import MInvoiceDetail from "@/mobile/pages/MInvoiceDetail";
import MRevenue from "@/mobile/pages/MRevenue";
import MNotifications from "@/mobile/pages/MNotifications";
import MProfile from "@/mobile/pages/MProfile";
import MMore from "@/mobile/pages/MMore";
import MAgenda from "@/mobile/pages/MAgenda";
import AdminAgenda from "@/pages/admin/AdminAgenda";
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
import AdminCatalog from "@/pages/admin/AdminCatalog";
import AdminPortfolio from "@/pages/admin/AdminPortfolio";
import AdminSocial from "@/pages/admin/AdminSocial";

// Client Portal
import ClientLogin from "@/pages/client/ClientLogin";
import ClientDashboard from "@/pages/client/ClientDashboard";
import LoginPage from "@/pages/LoginPage";
import PublicSignaturePage from "@/pages/PublicSignaturePage";

// Layout
import PublicLayout from "@/components/layout/PublicLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import RouteTitle from "@/components/RouteTitle";

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
    <ThemeProvider defaultTheme="dark">
      <div className="App">
        <BrowserRouter>
          <RouteTitle />
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/services/peinture" element={<PeinturePage />} />
              <Route path="/services/renovation" element={<RenovationPage />} />
              <Route path="/services/entretien" element={<EntretienPage />} />
              <Route path="/services/climatiseurs" element={<ClimatiseursPage />} />
              <Route path="/services/tv-tech" element={<TvTechPage />} />
              <Route path="/services/mobilier" element={<MobilierPage />} />
              <Route path="/mobilier" element={<MobilierPage />} />
              <Route path="/services/decoration" element={<DecorationPage />} />
              <Route path="/decoration" element={<DecorationPage />} />
              <Route path="/services/murs-accent" element={<MursAccentPage />} />
              <Route path="/murs-accent" element={<MursAccentPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/soumission" element={<SoumissionPage />} />
              <Route path="/paiement" element={<PaymentPage />} />
              <Route path="/paiement/succes" element={<PaymentSuccessPage />} />
              <Route path="/paiement/annule" element={<PaymentCancelPage />} />
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
            
            {/* Public Signature Page (DocuSign style - no layout) */}
            <Route path="/sign/:type/:token" element={<PublicSignaturePage />} />
            
            {/* Public tokenized invoice payment (no login) */}
            <Route path="/facture/payer/:token" element={<PublicInvoicePaymentPage />} />
            
            {/* Client Portal - No layout */}
            <Route path="/portail-client" element={<ClientPortalPage />} />
            
            {/* Unified Login Page */}
            <Route path="/connexion" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Password reset flow (public) */}
            <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
            <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
            
            {/* Client Portal - New */}
            <Route path="/client/login" element={<ClientLogin />} />
            <Route path="/client/register" element={<ClientLogin />} />
            <Route path="/client/dashboard" element={<ClientDashboard />} />
            <Route path="/client/projects" element={<ClientDashboard />} />
            <Route path="/client/invoices" element={<ClientDashboard />} />
            
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
              <Route path="/admin/catalog" element={<AdminCatalog />} />
              <Route path="/admin/portfolio" element={<AdminPortfolio />} />
              <Route path="/admin/social" element={<AdminSocial />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
              <Route path="/admin/site-settings" element={<AdminSiteSettings />} />
              <Route path="/admin/agenda" element={<AdminAgenda />} />
            </Route>

            {/* Mobile management PWA */}
            <Route path="/m/login" element={<MLogin />} />
            <Route path="/m" element={<MobileLayout />}>
              <Route index element={<MDashboard />} />
              <Route path="leads" element={<MLeads />} />
              <Route path="leads/:id" element={<MLeadDetail />} />
              <Route path="leads/:id/quote" element={<MQuoteCreate />} />
              <Route path="quotes" element={<MQuotes />} />
              <Route path="quotes/:id" element={<MQuoteDetail />} />
              <Route path="clients" element={<MClients />} />
              <Route path="clients/:id" element={<MClientDetail />} />
              <Route path="projects" element={<MProjects />} />
              <Route path="projects/:id" element={<MProjectDetail />} />
              <Route path="invoices" element={<MInvoices />} />
              <Route path="invoices/new" element={<MInvoiceCreate />} />
              <Route path="invoices/:id" element={<MInvoiceDetail />} />
              <Route path="revenue" element={<MRevenue />} />
              <Route path="notifications" element={<MNotifications />} />
              <Route path="profile" element={<MProfile />} />
              <Route path="plus" element={<MMore />} />
              <Route path="agenda" element={<MAgenda />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
