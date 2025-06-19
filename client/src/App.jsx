// src/App.jsx
import './App.css'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import About from './pages/About'
import RouteDisplay from './pages/RouteDisplay';
import Map from './pages/Map';

function App() {
    return (
        <Router>
            <div className="bg-blue-100 p-4">
                <h1>Cyclone</h1>
                <nav className="mt-2">
                    <Link to="/" className="mr-4 text-blue-600">Home</Link>
                    <Link to="/login" className="mr-4 text-blue-600">Login</Link>
                    <Link to="/routes" className="mr-4 text-blue-600">Routes</Link>
                    <Link to="/map" className="text-blue-600">Maps</Link>
                </nav>
            </div>

            <Routes>
                <Route path="/" element={<h2 className="p-4">Home Page</h2>} />
                <Route path="/routes" element={<RouteDisplay />} />
                <Route path="/map" element={<Map />} />
            </Routes>
        </Router>
    )
}

export default App

