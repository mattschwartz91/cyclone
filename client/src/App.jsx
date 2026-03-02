import './index.css';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import ButtonGradient from './assets/svg/ButtonGradient';
import Header from './components/Header';
import Home from './components/Home';
import About from './components/About';
import GenerateRoutes from './components/GenerateRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthModalProvider } from './contexts/AuthModalContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuthModal } from './contexts/AuthModalContext';
import { UnitsContextProvider} from "./contexts/UnitsContext";

// Main App Layout Component
const AppLayout = () => {
  const location = useLocation();

  useEffect(() => {
    // Handle scrolling after navigation from other pages
    if (location.state?.scrollToHash) {
      const targetHash = location.state.scrollToHash;
      const targetId = targetHash.replace('#', '');
      
      // Updates the URL to include the hash
      window.history.replaceState(null, '', targetHash);
      
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (location.hash) {
      // Handles direct hash navigation
      const targetId = location.hash.replace('#', '');
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (location.pathname === '/' && !location.hash) {
      // When loading the home page without any hash, scroll to home section
      const homeElement = document.getElementById('home');
      if (homeElement) {
        homeElement.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [location]);

  // Observes the main page sections and updates the URL as the user scrolls
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const sectionIds = ['home', 'about', 'generate-routes'];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!sections.length) return;

    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -40% 0px', // center of viewport
      threshold: 0.1,
    };

    const onIntersect = (entries) => {
      // Find the entry that is most visible
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible && visible.target && visible.target.id) {
        const hash = `#${visible.target.id}`;
        // Use replaceState to avoid polluting back/forward history during scroll
        window.history.replaceState(null, '', hash);
      }
    };

    const observer = new IntersectionObserver(onIntersect, observerOptions);
    sections.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="pt-[4.75rem] lg:pt-[6.25rem] overflow-hidden">
        <Header/>
        <Home />
        <About />
        <GenerateRoutes />
      </div>
      <ButtonGradient />
    </ErrorBoundary>
  );
};

// Redirect component that shows Coming Soon modal when profile routes are accessed
const ComingSoonRedirect = () => {
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    // Trigger the Coming Soon modal after redirect
    openAuthModal('coming-soon');
  }, []);

  return <Navigate to="/" replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <AuthModalProvider>
        <UnitsContextProvider>
          <Routes>
            <Route path="/" element={<AppLayout />} />
            <Route path="/profile" element={<ComingSoonRedirect />} />
            <Route path="/edit-profile" element={<ComingSoonRedirect />} />
          </Routes>
        </UnitsContextProvider>
      </AuthModalProvider>
    </AuthProvider>
  );
}

export default App;
