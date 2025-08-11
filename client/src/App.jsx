import './index.css';
import { Routes, Route } from 'react-router-dom';
import ButtonGradient from './assets/svg/ButtonGradient';
import Header from './components/Header';
import Home from './components/Home';
import About from './components/About';
import GenerateRoutes from './components/GenerateRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import RouteDisplay from './pages/RouteDisplay';
import { AuthModalProvider } from './contexts/AuthModalContext';

// Main App Layout Component
const AppLayout = () => {
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

const App = () => {
  return (
    <AuthModalProvider>
      <Routes>
        <Route path="/" element={<AppLayout />} />
        <Route path="/routes" element={<RouteDisplay />} />
      </Routes>
    </AuthModalProvider>
  );
}

export default App;


