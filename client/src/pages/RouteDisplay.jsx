// pages/RouteDisplay.jsx
import React, {useState, useEffect} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import Header from '../components/Header';
import Button from '../components/Button';
import ButtonGradient from '../assets/svg/ButtonGradient';
import RouteStats from '../components/RouteStats';
import RoutePreferences from '../components/RoutePreferences';
import CueSheet from '../components/CueSheet';
import { generateRoute } from '../utils/routeApi';

function calculateRouteStats(route) {
    if (!route || route.length < 2) return { distanceKm: null, elevationM: null };
    let distanceKm = 0;
    let elevationM = 0;
    for (let i = 1; i < route.length; i++) {
        const lat1 = route[i - 1].lat, lon1 = route[i - 1].lon;
        const lat2 = route[i].lat, lon2 = route[i].lon;
        // Haversine formula for distance
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceKm += R * c;
        // Elevation gain (if available)
        if (route[i].elevation !== undefined && route[i - 1].elevation !== undefined) {
            const gain = route[i].elevation - route[i - 1].elevation;
            if (gain > 0) elevationM += gain;
        }
    }
    return { distanceKm, elevationM };
}

export default function RouteDisplay() {
    const location = useLocation();
    const navigate = useNavigate();
    const routePreferences = location.state?.preferences || {};
    
    const [cueSheet, setCueSheet] = useState([]);
    // default units = imperial
    const [unitSystem, setUnitSystem] = useState("imperial");
    // gpx info is in metric
    const [rawStats, setRawStats] = useState({ distanceKm: null, elevationM: null });
    // name of current route
    // TODO: possible AI integration can be naming routs
    const [routeName, setRouteName] = useState("Generated Route");
    const [stats, setStats] = useState({ distanceKm: null, elevationM: null });

    // route preferences/parameters - use passed state or defaults
    // basic: starting point, target distance, target elevation
    // advanced: bike routes weight, poi weight
    // TODO: use location to set default starting point, otherwise make it city hall
    // TODO: default distace: 20 miles; default elevation: 1000ft
    const [preferences, setPreferences] = useState({
        start_lat: routePreferences.startLat || 39.95,
        start_lon: routePreferences.startLon || -75.16,
        end_lat: routePreferences.endLat || 39.98,
        end_lon: routePreferences.endLon || -75.20,
        distance_target: routePreferences.distanceTarget || 8.0,
        elevation_target: routePreferences.elevationTarget || 100,
        bike_lanes: routePreferences.bikeLanes || true,
        points_of_interest: routePreferences.pointsOfInterest || false,
        avoid_hills: routePreferences.avoidHills || true,
    });
    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Auto-generate route when component mounts with preferences
    useEffect(() => {
        if (routePreferences && Object.keys(routePreferences).length > 0) {
            handleGenerateRoute();
        }
    }, []);

    const handleGenerateRoute = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await generateRoute(preferences);
            setRoute(data.route);
            setRouteName(`Route (${data.total_length_km?.toFixed(2) || '?'} km)`);
            
            // Include total ride time from API response
            const routeStats = calculateRouteStats(data.route);
            routeStats.totalRideTime = data.total_ride_time;
            routeStats.totalRideTimeMinutes = data.total_ride_time_minutes;
            
            setStats(routeStats);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="pt-[4.75rem] lg:pt-[6.25rem] overflow-hidden">
                <Header/>
                <div className="min-h-screen bg-gradient-to-br from-n-8 via-n-7 to-n-6 text-n-1 p-4">
                    <motion.div 
                        className="container mx-auto"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        {/* Back Button */}
                        <motion.div 
                            className="mb-6"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <Button 
                                onClick={() => navigate('/')}
                                className="flex items-center gap-2"
                                outline
                            >
                                ← Back to Home
                            </Button>
                        </motion.div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left Sidebar - Route Preferences */}
                            <motion.div 
                                className="lg:col-span-3"
                                initial={{ opacity: 0, x: -40 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                            >
                                <div className="space-y-4">
                                    <div className="bg-n-8/40 backdrop-blur-sm rounded-2xl border border-n-2/20 p-6">
                                        <h3 className="text-lg font-semibold mb-4">Route Preferences</h3>
                                        <RoutePreferences preferences={preferences} setPreferences={setPreferences} />
                                    </div>
                                    <Button className="w-full" onClick={handleGenerateRoute} disabled={loading}>
                                        {loading ? 'Generating...' : 'Generate New Route'}
                                    </Button>
                                    {error && (
                                        <motion.div 
                                            className="p-4 bg-color-3/20 border border-color-3/50 rounded-xl"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <p className="text-color-3 text-sm font-medium">{error}</p>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Center - Map and Route Name */}
                            <motion.div 
                                className="lg:col-span-6 flex flex-col items-center space-y-4"
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                            >
                                <h2 className="text-2xl font-bold text-center">{routeName}</h2>
                                <div className="w-full h-[400px] lg:h-[500px] xl:h-[600px] rounded-2xl shadow-xl overflow-hidden border border-n-2/20">
                                    <MapContainer className="h-full w-full" center={[39.95, -75.16]} zoom={13}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        {route && (
                                            <>
                                                <Polyline positions={route.map(pt => [pt.lat, pt.lon])} color="#ac6cff" weight={4} />
                                                {/* Start Marker */}
                                                <Marker position={[route[0].lat, route[0].lon]}>
                                                    <Popup>Start</Popup>
                                                </Marker>
                                                {/* End Marker */}
                                                <Marker position={[route[route.length - 1].lat, route[route.length - 1].lon]}>
                                                    <Popup>End</Popup>
                                                </Marker>
                                            </>
                                        )}
                                    </MapContainer>
                                </div>
                            </motion.div>

                            {/* Right Sidebar - Stats and Cue Sheet */}
                            <motion.div 
                                className="lg:col-span-3"
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.5 }}
                            >
                                <div className="space-y-4">
                                    <div className="bg-n-8/40 backdrop-blur-sm rounded-2xl border border-n-2/20 p-6">
                                        <RouteStats stats={stats} unitSystem={unitSystem} setUnitSystem={setUnitSystem} />
                                    </div>
                                    
                                    <div className="bg-n-8/40 backdrop-blur-sm rounded-2xl border border-n-2/20 p-6">
                                        <CueSheet cueSheet={cueSheet} />
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <Button 
                                            className="w-full" 
                                            onClick={() => {
                                                // TODO: Generate and download actual GPX file
                                                console.log("Exporting route as GPX...");
                                            }}
                                        >
                                            Export GPX
                                        </Button>
                                        
                                        <Button 
                                            className="w-full" 
                                            onClick={() => {
                                                // TODO: Share route functionality
                                                console.log("Sharing route...");
                                            }}
                                            outline
                                        >
                                            Share Route
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
            <ButtonGradient />
        </>
    );
}
