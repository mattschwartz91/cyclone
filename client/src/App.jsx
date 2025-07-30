// src/App.jsx
import './App.css'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import RouteDisplay from './pages/RouteDisplay';
import Map from './pages/Map';
import RoutePlan from './pages/RoutePlan';
import Login from './pages/Login.jsx';
import UserProfile from './pages/UserProfile.jsx';
import EditProfile from './pages/EditProfile.jsx';
import { Menu, MenuButton, MenuItems } from '@headlessui/react';

// TODO: Improve scaling on the nav bar
// TODO: add logo to navbar
// TODO: add loged in/logged out functionality
// TODO: make it so the page you're currently on isn't displayed

function AppLayout() {
  const location = useLocation();
  const Navigate = useNavigate();
  const isHomePage = location.pathname === '/';
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };
  /*
  return (
    <div className="min-h-screen">
      {!isHomePage && (
        <header className="bg-blue-500 text-white p-4 shadow-md">
          <div className="w-full flex justify-between items-center">
            <h1 className="text-2xl font-bold">Cyclone</h1>
            <nav className="flex space-x-6" >
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
}*/

  return (
    <div className="min-h-screen">
      {!isHomePage && (
        <header className="bg-blue-500 text-white p-4 shadow-md">
          <div className="w-full flex justify-between items-center">
            <h1 className="text-2xl font-bold">Cyclone</h1>
            <nav className="flex space-x-2 sm:space-x-4">
              {location.pathname !== '/' && (
                <Link to="/" className="px-2 sm:px-4 py-2 text-base sm:text-lg md:text-xl font-bold text-grey-800 bg-white border border-2 border-white hover:bg-grey-100 hover:underline rounded transition-colors">
                  Home
                </Link>
              )}
              {location.pathname !== '/routes' && (
                <Link to="/routes" className="px-2 sm:px-4 py-2 text-base sm:text-lg md:text-xl font-bold text-grey-800 bg-white border border-2 border-white hover:bg-bg-grey-100 hover:underline rounded transition-colors">
                  Routes
                </Link>
              )}
              {user ? (
                <>
                  {location.pathname !== '/plan' && (
                    <Link to="/plan" className="px-2 sm:px-4 py-2 text-base sm:text-lg md:text-xl font-bold text-grey-800 bg-white border border-2 border-white hover:bg-grey-100 hover:underline rounded transition-colors">
                      Plan
                    </Link>
                  )}
                  <div className="relative inline-block text-left">
                    <Menu>
                      <MenuButton className="flex items-center px-2 sm:px-4 py-2 text-base sm:text-lg md:text-xl font-bold bg-white border border-2 border-white rounded hover:bg-gray-100 transition-colors">
                        <img
                          src={user.image || '/default-avatar.png'}
                          alt="Profile"
                          className="w-6 h-6 rounded-full mr-2"
                        />
                        <span className="hidden sm:inline text-black">{user.username}</span>
                      </MenuButton>
                      <MenuItems className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10">
                        <div className="py-1">
                          <Link to="/profile" className="block px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">
                            My Profile
                          </Link>
                          <Link to="/profile/edit" className="block px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">
                            Edit Profile
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            Logout
                          </button>

                        </div>
                      </MenuItems>
                    </Menu>
                  </div>
                </>
              ) : (location.pathname !== '/login' && (
                <Link to="/login" className="px-2 sm:px-4 py-2 text-base sm:text-lg md:text-xl font-bold text-grey-800 bg-white border border-2 border-white hover:bg-grey-100 hover:underline rounded transition-colors">
                  Login
                </Link>
              )
              )}
            </nav>
          </div>
        </header>
      )}
      <main className={!isHomePage ? "px-4 py-6" : ""}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/routes" element={<RouteDisplay />} />
          <Route path="/map" element={<Map />} />
          <Route path="/plan" element={<RoutePlan />} />
          <Route path="/login" element={<Login />} /> {/* TODO: Replace with actual login page */}
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
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