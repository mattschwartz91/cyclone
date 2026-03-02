import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import Section from "./design/Section";
import Heading from "./ui/HeadingAnimation";
import Button from "./Button";
import MapComponent from "./MapComponent";
import RoutePreferences from "./RoutePreferences";
import CueSheet from "./CueSheet";
import RouteStats from "./RouteStats";
import { generateRoute, generateGpxFile, rerouteWithWaypoints } from "../utils/routeApi";
import { useAuth } from "../contexts/AuthContext";
import { useUnits } from "../contexts/UnitsContext";
import { kmToUi, distLabel } from "../utils/units";
import SaveAndExport from "./SaveAndExport";

const GenerateRoutes = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();
  const { units } = useUnits();

  // State management
  const [location, setLocation] = useState(null);
  const [preferences, setPreferences] = useState({
    startingPoint: "",
    startingPointCoords: null,
    endingPoint: "",
    endingPointCoords: null,
    distanceTarget: 16.1,
    routeType: "scenic",
    customDescription: "",
    bikeLanes: false,
    pointsOfInterest: false,
    avoidHills: false,
    avoidHighTraffic: false,
    preferGreenways: false,
    includeScenic: false,
  });

  const [routeData, setRouteData] = useState(null);
  const [stats, setStats] = useState({ distanceKm: null, elevationM: null });
  const [elevationProfile, setElevationProfile] = useState([]);
  const [elevationStats, setElevationStats] = useState(null);
  const [instructions, setInstructions] = useState([]);
  const [hasGeneratedRoute, setHasGeneratedRoute] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const resultsRef = useRef(null);
  const [cueSheet, setCueSheet] = useState([]);

  // Draggable waypoints state
  const [waypoints, setWaypoints] = useState([]); // Sampled from the built route polyline
  const [showIntermediateWaypoints, setShowIntermediateWaypoints] = useState(true);
  const [isRerouting, setIsRerouting] = useState(false);
  const [isRouteModified, setIsRouteModified] = useState(false);
  const previousWaypointsRef = useRef([]); // For reverting on error
  const originalGptMetadataRef = useRef(null); // Preserve GPT metadata across reroutes

  useEffect(() => {
    const selectedRoute = state?.selectedRoute;
    if (selectedRoute && (state?.fromRouteGeneration || state?.fromProfile)) {
      // Transform selectedRoute to match MapComponent's routeData format
      const transformedRouteData = {
        route: selectedRoute.waypoints || [], // Assuming waypoints is [{ lat, lon }, ...]
        total_length_km: selectedRoute.rawStats.distanceKm || 0,
        total_length_formatted:
          selectedRoute.total_length_formatted ||
          (selectedRoute.rawStats.distanceKm
            ? `${kmToUi(selectedRoute.rawStats.distanceKm, units).toFixed(1)} ${distLabel(units)}`
            : `${kmToUi(selectedRoute.rawStats.distanceKm || 0, units).toFixed(1)} ${distLabel(units)}`),
      };

      // Update states
      setRouteData(transformedRouteData);
      if (state?.rawStats) {
        setStats(state.rawStats);
      } else {
        setStats({
          distanceKm: transformedRouteData.total_length_km,
          distanceFormatted: transformedRouteData.total_length_formatted,
          elevationM: selectedRoute.rawStats.elevationM || 0,
          totalRideTime: selectedRoute.rawStats.totalRideTimeMin || null,
          routeName: selectedRoute.gpt_metadata?.gpt_route_name || null,
          routeDescription: selectedRoute.gpt_metadata?.gpt_description || null
        })
      };
      setElevationProfile(selectedRoute.elevation_profile || []);
      setElevationStats(selectedRoute.elevation_stats || null);
      setInstructions(selectedRoute.instructions || []);
      if (state?.cueSheet?.length) {
        setCueSheet(state.cueSheet);
      } else {
        setCueSheet(
          selectedRoute.instructions?.length > 0
            ? selectedRoute.instructions
            : [
              `Start your route`,
              `Route distance: ${transformedRouteData.total_length_formatted}`,
              `Arrive at destination`,
            ]
        );
      }
      setHasGeneratedRoute(true);

      // Sample draggable waypoints from the loaded route
      if (transformedRouteData.route && transformedRouteData.route.length >= 2) {
        setWaypoints(sampleWaypointsFromRoute(transformedRouteData.route, 5));
      }

      // Scroll to results section only when coming from route generation
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [state]);

  // When user selects a Starting Point, recenter the map and show a pin
  useEffect(() => {
    if (preferences?.startingPointCoords?.lat && preferences?.startingPointCoords?.lng) {
      setLocation([preferences.startingPointCoords.lat, preferences.startingPointCoords.lng]);
    }
  }, [preferences?.startingPointCoords]);

  // When user selects an Ending Point, update the map to show both pins
  useEffect(() => {
    if (preferences?.endingPointCoords?.lat && preferences?.endingPointCoords?.lng) {
      // If we have both start and end points, center the map to show both
      if (preferences?.startingPointCoords?.lat && preferences?.startingPointCoords?.lng) {
        const startLat = preferences.startingPointCoords.lat;
        const startLng = preferences.startingPointCoords.lng;
        const endLat = preferences.endingPointCoords.lat;
        const endLng = preferences.endingPointCoords.lng;

        // Calculate center point between start and end
        const centerLat = (startLat + endLat) / 2;
        const centerLng = (startLng + endLng) / 2;
        setLocation([centerLat, centerLng]);
      }
    }
  }, [preferences?.endingPointCoords]);

  /**
   * Sample N evenly-spaced waypoints from a route polyline.
   * These are real road coordinates (Valhalla already placed them on roads),
   * so rerouting through them is reliable.
   */
  const sampleWaypointsFromRoute = (route, count = 6) => {
    if (!route || route.length < 2) return [];
    if (route.length <= count) {
      // Route has fewer points than requested — use them all
      return route.map((p) => ({ lat: p.lat, lon: p.lon }));
    }

    const sampled = [];
    // Always include the first point (start)
    sampled.push({ lat: route[0].lat, lon: route[0].lon });

    // Pick evenly-spaced intermediate points
    const step = (route.length - 1) / (count - 1);
    for (let i = 1; i < count - 1; i++) {
      const idx = Math.round(step * i);
      sampled.push({ lat: route[idx].lat, lon: route[idx].lon });
    }

    // Always include the last point (end)
    sampled.push({
      lat: route[route.length - 1].lat,
      lon: route[route.length - 1].lon,
    });

    return sampled;
  };

  const handleGenerateRoute = async () => {
    const hasLocation = location || preferences.startingPointCoords;
    const hasCoordinates = location?.lat || preferences.startingPointCoords?.lat;

    if (!hasLocation) {
      setError("Please provide at least a starting location or enable precise location.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const routePreferences = {
        ...preferences,
        startLat: preferences.startingPointCoords?.lat || location?.lat,
        startLon: preferences.startingPointCoords?.lng || location?.lng,
        endLat: preferences.endingPointCoords?.lat,
        endLon: preferences.endingPointCoords?.lng,
        location: location,
        unitSystem: distLabel(units), // Pass current unit system ('mi' or 'km')
      };

      const data = await generateRoute(routePreferences);
      setRouteData(data);
      setIsRouteModified(false);
      console.log('Route data received from backend:', data);
      console.log('Route coordinates:', data.route);
      console.log('Route length:', data.route ? data.route.length : 'No route array');

      // Sample draggable waypoints from the built route polyline.
      // These points are already on real roads (placed by Valhalla), so
      // rerouting through them is reliable.
      // Using 5 waypoints max to stay within GraphHopper fallback limit.
      if (data.route && data.route.length >= 2) {
        const sampled = sampleWaypointsFromRoute(data.route, 5);
        setWaypoints(sampled);
        console.log('Sampled waypoints from route polyline:', sampled.length);
      }

      // Preserve GPT metadata for display across reroutes
      if (data.gpt_metadata) {
        originalGptMetadataRef.current = data.gpt_metadata;
      }

      setStats({
        distanceKm: data.total_distance_km || data.total_length_km || data.total_distance || null,
        distanceFormatted: data.total_length_formatted || 
          (data.total_distance && data.total_distance_unit ? 
            `${data.total_distance.toFixed(2)} ${data.total_distance_unit}` : null),
        elevationM: data.elevation_gain_m || data.total_elevation_gain || null,
        totalRideTime: data.total_ride_time || null,
        difficulty: data.difficulty || null,
        routeName: data.gpt_metadata?.gpt_route_name || null,
        routeDescription: data.gpt_metadata?.gpt_description || null
      });
      setElevationProfile(data.elevation_profile || []);
      setElevationStats(data.elevation_stats || null);

      // Set instructions from API response
      if (data.instructions && data.instructions.length > 0) {
        setInstructions(data.instructions);
        setCueSheet([]);
      } else {
        const destinationText = preferences.endingPoint || 'your destination';
        
        let distanceFormatted;
        if (data.total_distance && data.total_distance_unit) {
          distanceFormatted = `${data.total_distance.toFixed(2)} ${data.total_distance_unit}`;
        } else {
          const distanceKm = data.total_distance_km || data.total_length_km || 0;
          distanceFormatted = data.total_length_formatted || `${kmToUi(distanceKm, units).toFixed(2)} ${distLabel(units)}`;
        }
        
        const generatedCueSheet = [
          `Start your route`,
          `Route distance: ${distanceFormatted}`,
          `Arrive at ${destinationText}`
        ];
        setCueSheet(generatedCueSheet);
        setInstructions([]);
      }

      setHasGeneratedRoute(true);

      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (err.message === "LOCATION_REQUIRED") {
        errorMessage = "Please provide a starting location. You can either enter an address or click the 'Current Location' option to use your current location.";
      } else if (err.message === "INVALID_COORDINATES") {
        errorMessage = "The provided coordinates are invalid or outside the supported area. Please check your starting and ending locations.";
      } else if (err.message === "SERVER_ERROR") {
        errorMessage =
          "The route generation service is currently experiencing issues. Please try again in a few moments.";
      } else if (err.message === "NETWORK_ERROR") {
        errorMessage =
          "Unable to connect to the route generation service. Please check your internet connection and try again.";
      } else if (
        err.message.includes("Failed to fetch") ||
        err.message.includes("Connection refused")
      ) {
        errorMessage =
          "Unable to connect to the route generation service. Please check if the backend server is running on localhost:8000.";
      }
      setError(errorMessage);
      console.error("Route generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle waypoint drag — reroute automatically when user moves a waypoint
  const handleWaypointDrag = async (waypointIndex, newLat, newLon) => {
    console.log('=== WAYPOINT DRAG START ===');
    console.log('Waypoint index:', waypointIndex);
    console.log('New position:', { lat: newLat, lon: newLon });
    console.log('Current waypoints:', JSON.stringify(waypoints));
    console.log('Is currently rerouting?', isRerouting);

    if (isRerouting) {
      console.log('Reroute blocked - already in progress');
      return;
    }

    // Save previous state for reverting on error
    previousWaypointsRef.current = [...waypoints];
    const previousRouteData = routeData;

    // Update the dragged waypoint
    const updatedWaypoints = waypoints.map((wp, i) =>
      i === waypointIndex ? { ...wp, lat: newLat, lon: newLon } : wp
    );
    setWaypoints(updatedWaypoints);

    // Reroute through backend
    setIsRerouting(true);
    setError(null);

    try {
      console.log('=== CALLING REROUTE API ===');
      console.log('Updated waypoints being sent:', JSON.stringify(updatedWaypoints));
      console.log('Preferences:', JSON.stringify({ ...preferences, unitSystem: distLabel(units) }));

      const data = await rerouteWithWaypoints(updatedWaypoints, {
        ...preferences,
        unitSystem: distLabel(units),
      });

      console.log('=== REROUTE API SUCCESS ===');
      console.log('Response data keys:', Object.keys(data));
      console.log('New route length:', data.route?.length);

      // Preserve the original GPT metadata (route name, description) across reroutes
      if (originalGptMetadataRef.current) {
        data.gpt_metadata = originalGptMetadataRef.current;
      }

      setRouteData(data);
      setIsRouteModified(true);

      // Keep the waypoints the user set - don't re-sample them.
      // The backend (Valhalla) automatically snaps waypoints to roads,
      // and the route polyline reflects the actual road path.
      // Re-sampling would cause all waypoints to move when dragging just one.
      setWaypoints(updatedWaypoints);

      // Update stats
      setStats((prev) => ({
        ...prev,
        distanceKm: data.total_distance_km || data.total_length_km || data.total_distance || null,
        distanceFormatted:
          data.total_length_formatted ||
          (data.total_distance && data.total_distance_unit
            ? `${data.total_distance.toFixed(2)} ${data.total_distance_unit}`
            : null),
        elevationM: data.elevation_gain_m || data.total_elevation_gain || null,
        totalRideTime: data.total_ride_time || null,
      }));

      // Update instructions
      if (data.instructions && data.instructions.length > 0) {
        setInstructions(data.instructions);
        setCueSheet([]);
      }

      console.log('Reroute successful:', {
        waypoints: updatedWaypoints.length,
        routePoints: data.route?.length,
      });
    } catch (err) {
      console.error('=== REROUTE API FAILED ===');
      console.error('Error object:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      console.error('Waypoints that failed:', JSON.stringify(updatedWaypoints));
      // Revert waypoints and route on failure
      setWaypoints(previousWaypointsRef.current);
      setRouteData(previousRouteData);

      // Provide specific error messages based on the error type
      let errorMessage = 'Could not reroute to this location. The waypoint has been reverted.';
      if (err.message === 'REROUTE_SERVER_ERROR') {
        errorMessage = 'Routing service temporarily unavailable. Please try again in a moment.';
      } else if (err.message === 'INVALID_WAYPOINTS') {
        errorMessage = 'Invalid waypoint location. Try moving the marker to a nearby road.';
      } else if (err.message === 'REROUTE_NETWORK_ERROR') {
        errorMessage = 'Network error — check your connection and try again.';
      } else if (err.message.includes('timeout') || err.message.includes('TIMEOUT')) {
        errorMessage = 'Routing took too long. Try moving the waypoint closer to the route.';
      } else if (err.message.includes('No valid route') || err.message.includes('NO_ROUTE')) {
        errorMessage = 'Cannot find a bikeable route through this location. Try a different spot.';
      }
      setError(errorMessage);

      // Clear the error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsRerouting(false);
    }
  };

  // DEBUG: Manual test reroute with known-good waypoints
  const testReroute = async () => {
    console.log('=== MANUAL TEST REROUTE ===');
    const testWaypoints = [
      { lat: 37.7749, lon: -122.4194 }, // San Francisco
      { lat: 37.7849, lon: -122.4094 },
      { lat: 37.7949, lon: -122.3994 }
    ];

    try {
      const data = await rerouteWithWaypoints(testWaypoints, {
        bikeLanes: false,
        avoidHills: false,
        avoidHighTraffic: false,
        unitSystem: 'km',
        routeType: 'scenic'
      });
      console.log('Test reroute SUCCESS:', data);
      console.log('Route points:', data.route?.length);
      alert('Test reroute SUCCESS - check console for details');
    } catch (err) {
      console.error('Test reroute FAILED:', err);
      alert('Test reroute FAILED: ' + err.message + ' - check console for details');
    }
  };

  const hasPreferences =
    preferences.startingPoint || preferences.endingPoint || location;

  return (
    <Section id="generate-routes">
      <div className="container relative z-10">
        <Heading title="Generate Custom Routes" />

        {/* Main Planning Section */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Left - Route Preferences */}
          <motion.div
            className="lg:col-span-1 space-y-6"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
          >
            <RoutePreferences
              preferences={preferences}
              setPreferences={setPreferences}
              userLocation={location}
            />
            <Button
              className="w-full"
              onClick={handleGenerateRoute}
              disabled={
                isGenerating || (!location && !preferences.startingPointCoords)
              }
            >
              {isGenerating ? (
                <div className="flex items-center gap-3">
                  <span>Generating Route</span>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                "Generate Route"
              )}
            </Button>

            {/* DEBUG: Test Reroute Button */}
            {/* <Button
              className="w-full mt-2 !bg-yellow-600 hover:!bg-yellow-700"
              onClick={testReroute}
            >
              [DEBUG] Test Reroute API
            </Button> */}

            {/* Error Display */}
            {error && (
              <motion.div
                className="p-4 bg-gradient-to-r from-color-3/5 to-color-3/10 border border-color-3/20 rounded-xl backdrop-blur-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-color-3/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-color-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-color-3 mb-1">
                      ⚠️ Route Generation Error
                    </h4>
                    <div className="text-xs text-n-3">{error}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right - Map Component */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
          >
            <MapComponent
              location={location}
              setLocation={setLocation}
              error={error}
              setError={setError}
              routeData={routeData}
              isGenerating={isGenerating}
              endingPointCoords={preferences.endingPointCoords}
              waypoints={waypoints}
              showIntermediateWaypoints={showIntermediateWaypoints}
              setShowIntermediateWaypoints={setShowIntermediateWaypoints}
              onWaypointDrag={handleWaypointDrag}
              isRerouting={isRerouting}
              isRouteModified={isRouteModified}
            />
          </motion.div>
        </div>

        {hasGeneratedRoute && (
          <motion.div
            ref={resultsRef}
            className="grid lg:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Left - Stats */}
            <div className="space-y-6">
              <RouteStats
                stats={stats}
                elevationProfile={elevationProfile}
                elevationStats={elevationStats}
              />
              {stats.distanceKm && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="space-y-3"
                >
                </motion.div>
              )}
            </div>

            {/* Center - Cue Sheet */}
            <div>
              <CueSheet cueSheet={cueSheet} instructions={instructions} />
            </div>
            {/* Right - Save and Export */}
            <div>
              <SaveAndExport 
                routeData={routeData}
                stats={stats}
                cueSheet={cueSheet}
                preferences={preferences}
              />
            </div>
          </motion.div>
        )}
      </div>
    </Section>
  );
};

export default GenerateRoutes;