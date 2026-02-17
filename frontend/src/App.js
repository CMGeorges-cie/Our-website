import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Pages
import HomePage from "@/pages/HomePage";
import ServicesPage from "@/pages/ServicesPage";
import MobilierPage from "@/pages/MobilierPage";
import PortfolioPage from "@/pages/PortfolioPage";
import SoumissionPage from "@/pages/SoumissionPage";
import ContactPage from "@/pages/ContactPage";

// Admin Pages
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLeads from "@/pages/admin/AdminLeads";
import AdminLeadDetail from "@/pages/admin/AdminLeadDetail";
import AdminQuoteView from "@/pages/admin/AdminQuoteView";

// Layout
import PublicLayout from "@/components/layout/PublicLayout";
import AdminLayout from "@/components/layout/AdminLayout";

function App() {
  return (
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
          </Route>
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/leads" element={<AdminLeads />} />
            <Route path="/admin/leads/:id" element={<AdminLeadDetail />} />
            <Route path="/admin/quotes/:id" element={<AdminQuoteView />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
