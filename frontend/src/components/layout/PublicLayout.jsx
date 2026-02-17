import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import Footer from './Footer';
import StickyCTA from './StickyCTA';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <StickyCTA />
    </div>
  );
}
