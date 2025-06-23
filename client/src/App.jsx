// src/App.jsx
import './App.css'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import RouteDisplay from './pages/RouteDisplay';
import Map from './pages/Map';

// TODO: Improve scaling on the nav bar
// TODO: add logo to navbar
// TODO: add loged in/logged out functionality
// TODO: make it so the page you're currently on isn't displayed

function AppLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen">
      {!isHomePage && (
        <header className="bg-blue-500 text-white p-4 shadow-md">
          <div className="w-full flex justify-between items-center">
            <h1 className="text-2xl font-bold">Cyclone</h1>
            <nav className="flex space-x-6">
              <Link to="/" className="px-4 py-2 text-xl font-bold text-white !text-white bg-blue-500 border border-2 border-white hover:bg-blue-600 hover:underline rounded transition-colors">Home</Link>
              <Link to="/routes" className="px-4 py-2 text-xl font-bold text-white !text-white bg-blue-500 border border-2 border-white hover:bg-blue-600 hover:underline rounded transition-colors">Routes</Link>
              <Link to="/map" className="px-4 py-2 text-xl font-bold text-white !text-white bg-blue-500 border border-2 border-white hover:bg-blue-600 hover:underline rounded transition-colors">Login</Link>
            </nav>
          </div>
        </header>
      )}
      <main className={!isHomePage ? "px-4 py-6" : ""}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/routes" element={<RouteDisplay />} />
          <Route path="/map" element={<Map />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}

export default App

