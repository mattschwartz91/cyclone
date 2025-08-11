import React, { useState, useEffect, useRef } from 'react'
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import LocationAutocomplete from './LocationAutocomplete';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map recentering component with proper invalidation
function RecenterMap({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      // Use setTimeout to ensure the map container has finished resizing
      setTimeout(() => {
        map.setView(center, map.getZoom());
        map.invalidateSize(); // Force map to recalculate its size
      }, 100);
    }
  }, [center, map]);

  return null;
}

// GPS Location Control Component
function LocationControl({ onLocationFound, onLocationError }) {
  const map = useMap();

  useEffect(() => {
    const locationControl = L.control({ position: 'topright' });
    
    locationControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
      
      div.style.cssText = `
        background: #18181B !important;
        border: none !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
        transition: all 0.3s ease !important;
        overflow: hidden !important;
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        .location-control-button {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 36px !important;
          height: 36px !important;
          color: #F4F4F5 !important;
          text-decoration: none !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          position: relative !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
        }
        
        .location-control-button:hover {
          color: #AC6AFF !important;
          background: rgba(172, 106, 255, 0.1) !important;
          transform: scale(1.05) !important;
          box-shadow: 0 0 20px rgba(172, 106, 255, 0.3) !important;
        }
        
        .location-control-button:active {
          transform: scale(0.95) !important;
          box-shadow: 0 0 15px rgba(172, 106, 255, 0.5) !important;
        }
        
        .location-control-button svg {
          transition: transform 0.3s ease !important;
          width: 18px !important;
          height: 18px !important;
        }
        
        .location-control-button:hover svg {
          transform: rotate(45deg) !important;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(172, 106, 255, 0.7);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 0 10px rgba(172, 106, 255, 0);
            transform: scale(1.05);
          }
        }
        
        .location-control-button.loading {
          animation: pulse 2s infinite !important;
        }
      `;
      document.head.appendChild(style);
      
      // Create the button HTML 
      div.innerHTML = `
        <a href="#" title="Click to set your current location" role="button" aria-label="Set current location" class="location-control-button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M3.05,13H1V11H3.05C3.5,6.83 6.83,3.5 11,3.05V1H13V3.05C17.17,3.5 20.5,6.83 20.95,11H23V13H20.95C20.5,17.17 17.17,20.5 13,20.95V23H11V20.95C6.83,20.5 3.5,17.17 3.05,13M12,5A7,7 0 0,0 5,12A7,7 0 0,0 12,19A7,7 0 0,0 19,12A7,7 0 0,0 12,5Z"/>
          </svg>
        </a>
      `;

      const linkElement = div.querySelector('a');

      const updateButton = () => {
        linkElement.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M3.05,13H1V11H3.05C3.5,6.83 6.83,3.5 11,3.05V1H13V3.05C17.17,3.5 20.5,6.83 20.95,11H23V13H20.95C20.5,17.17 17.17,20.5 13,20.95V23H11V20.95C6.83,20.5 3.5,17.17 3.05,13M12,5A7,7 0 0,0 5,12A7,7 0 0,0 12,19A7,7 0 0,0 19,12A7,7 0 0,0 12,5Z"/>
          </svg>
        `;
      };

      L.DomEvent.on(div, 'click', function(e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);

        // Add loading 
        linkElement.classList.add('loading');
        linkElement.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
          </svg>
        `;
        linkElement.style.color = '#AC6AFF';

        if (!navigator.geolocation) {
          onLocationError("Geolocation is not supported by your browser.");
          linkElement.classList.remove('loading');
          updateButton(); // Reset button
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const newCenter = [latitude, longitude];
            map.setView(newCenter, 16);
            onLocationFound(newCenter);
            linkElement.classList.remove('loading');
            linkElement.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
              </svg>
            `;
            linkElement.style.color = '#10B981';
            setTimeout(() => {
              linkElement.style.color = '#F4F4F5';
              updateButton(); // Reset to normal crosshair
            }, 1500);
          },
          (err) => {
            onLocationError("Unable to retrieve your precise location.");
            linkElement.classList.remove('loading');
            linkElement.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
              </svg>
            `;
            linkElement.style.color = '#EF4444';
            setTimeout(() => {
              linkElement.style.color = '#F4F4F5';
              updateButton(); // Reset to normal crosshair
            }, 1500);
          }
        );
      });

      return div;
    };

    locationControl.addTo(map);

    return () => {
      map.removeControl(locationControl);
    };
  }, [map, onLocationFound, onLocationError]);

  return null;
}

// Handles zoom controls positioning
function ZoomControl() {
  const map = useMap();
  
  useEffect(() => {
    const zoomControl = L.control.zoom({ position: 'topleft' });
    zoomControl.addTo(map);
    
    const zoomStyle = document.createElement('style');
    zoomStyle.textContent = `
      .leaflet-control-zoom {
        border: none !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
        overflow: hidden !important;
        background: #18181B !important;
      }
      
      .leaflet-control-zoom a {
        background: #18181B !important;
        border: none !important;
        color: #F4F4F5 !important;
        width: 36px !important;
        height: 36px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        text-decoration: none !important;
        font-size: 18px !important;
        font-weight: bold !important;
        line-height: 1 !important;
        opacity: 1 !important;
        filter: none !important;
        position: relative !important;
      }
      
      .leaflet-control-zoom a:hover {
        color: #AC6AFF !important;
        background: #18181B !important;
        transform: scale(1.05) !important;
        box-shadow: 0 0 20px rgba(172, 106, 255, 0.3) !important;
        opacity: 1 !important;
        filter: none !important;
      }
      
      .leaflet-control-zoom a:active {
        transform: scale(0.95) !important;
        box-shadow: 0 0 15px rgba(172, 106, 255, 0.5) !important;
      }
      
      .leaflet-control-zoom a:focus {
        color: #AC6AFF !important;
        outline: none !important;
        box-shadow: 0 0 20px rgba(172, 106, 255, 0.3) !important;
      }
      
      .leaflet-control-zoom a:first-child {
        border-top-left-radius: 8px !important;
        border-top-right-radius: 8px !important;
        margin-bottom: 1px !important;
      }
      
      .leaflet-control-zoom a:last-child {
        border-bottom-left-radius: 8px !important;
        border-bottom-right-radius: 8px !important;
      }
      
      .leaflet-control-zoom a.leaflet-disabled {
        background: #18181B !important;
        opacity: 0.5 !important;
        color: #6B7280 !important;
      }
      
      .leaflet-control-zoom a.leaflet-disabled:hover {
        transform: none !important;
        box-shadow: none !important;
        color: #6B7280 !important;
      }
    `;
    document.head.appendChild(zoomStyle);
    
    return () => {
      map.removeControl(zoomControl);
      if (zoomStyle.parentNode) {
        zoomStyle.parentNode.removeChild(zoomStyle);
      }
    };
  }, [map]);

  return null;
}

// Component to handle map resize
function MapResizeHandler() {
  const map = useMap();
  
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      // Invalidate map size when container resizes
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    });

    const mapContainer = map.getContainer();
    if (mapContainer) {
      resizeObserver.observe(mapContainer);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [map]);

  return null;
}

const MapComponent = ({ location, setLocation, error, setError, routeData, isGenerating = false }) => {
  const mapRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialLocation, setHasInitialLocation] = useState(false);
  const [showPreciseLocationPrompt, setShowPreciseLocationPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [glow, setGlow] = useState(true);

  const handleAnimationComplete = () => {
    setGlow(false);
  };

  // Get approximate location based on IP if no location is set
  useEffect(() => {
    if (!location && !hasInitialLocation) {
      getApproximateLocation();
    }
  }, [location, hasInitialLocation]);

  const getApproximateLocation = async () => {
    try {
      setIsLoading(true);
      console.log("Attempting to get IP-based location...");
      
      const response = await fetch('http://ip-api.com/json/?fields=status,lat,lon,city,region,country');
      const data = await response.json();
      console.log("IP location service response:", data);
      
      if (data.status === 'success' && data.lat && data.lon) {
        console.log("Setting location from IP:", [data.lat, data.lon]);
        setLocation([data.lat, data.lon]);
        setHasInitialLocation(true);
        setShowPreciseLocationPrompt(true);
        setError(null);
      } else {
        console.warn("IP detection failed:", data);
        // Set default location the center of the US so map still shows if there's an error with fetching the user's IP location
        setLocation([39.8283, -98.5795]);
        setHasInitialLocation(true);
        setShowPreciseLocationPrompt(true);
        setError("Unable to determine your exact location. Please use the target icon to set your precise location.");
      }
    } catch (err) {
      console.error("Location detection error:", err);
      // Set default location the center of the US so map still shows if there's an error with fetching the user's IP location
      setLocation([39.8283, -98.5795]);
      setHasInitialLocation(true);
      setShowPreciseLocationPrompt(true);
      setError("Unable to determine your exact location. Please use the target icon to set your precise location.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPreciseLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation([latitude, longitude]);
        setShowPreciseLocationPrompt(false);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError("Unable to retrieve your precise location.");
        setIsLoading(false);
      }
    );
  };

  const handleLocationSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Use Nominatim API for geocoding (free OpenStreetMap service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=1&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setLocation([parseFloat(lat), parseFloat(lon)]);
        setHasInitialLocation(true);
        setShowPreciseLocationPrompt(false);
        setError(null);
        // Clear search query after successful search
        setSearchQuery('');
      } else {
        setError("Location not found. Please try a different search term.");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Unable to search for location. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className={`relative p-6 bg-n-8/40 backdrop-blur-sm rounded-2xl border transition-all duration-300 hover:border-color-1/50 hover:shadow-[0_0_25px_rgba(172,108,255,0.3)] hover:scale-105 cursor-pointer ${glow ? 'border-color-1/50' : 'border-n-2/20'}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
      viewport={{ once: true }}
      onAnimationComplete={handleAnimationComplete}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
    >
      {/* Title and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h3 className="h3 text-n-1">Route Map</h3>
        <div className="flex-1 max-w-md">
          <div className="flex gap-2">
          </div>
        </div>
      </div>
      
      {error && (
        <motion.div 
          className="mb-4 p-4 bg-gradient-to-r from-color-3/5 to-red-500/5 border border-color-3/30 rounded-xl backdrop-blur-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-color-3/10 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-color-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-color-3 mb-1">
                ⚠️ Location Detection
              </h4>
              <p className="text-xs text-n-3">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {showPreciseLocationPrompt && (
        <motion.div 
          className="mb-4 p-4 bg-gradient-to-r from-color-1/5 to-color-2/5 border border-color-1/20 rounded-xl backdrop-blur-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-color-1/10 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-color-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-n-1 mb-1">
                    📍 Location Set
                  </h4>
                  <p className="text-xs text-n-3">
                    We've detected your approximate area. Use the crosshair icon on the map for precise location.
                  </p>
                </div>
                <button
                  onClick={() => setShowPreciseLocationPrompt(false)}
                  className="ml-4 px-3 py-1.5 bg-n-8/80 hover:bg-n-7 text-n-3 hover:text-n-1 rounded-lg text-xs transition-all duration-300 border border-n-6 hover:border-color-1/30 hover:shadow-[0_0_10px_rgba(172,108,255,0.2)] hover:scale-105"
                >
                  ✓ Got it
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {!location ? (
        <div className="mb-4 h-96 md:h-[500px] lg:h-[700px] rounded-xl border border-n-6 bg-n-8/20 flex items-center justify-center">
          <div className="text-center max-w-md">
            {isLoading ? (
              <div>
                <div className="w-8 h-8 border-2 border-color-1 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="body-2 text-n-4">Getting your location...</p>
              </div>
            ) : (
              <>
                <motion.div
                  className="w-16 h-16 mx-auto mb-6"
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <svg 
                    className="w-full h-full text-color-1" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </motion.div>
                <h4 className="h4 text-n-1 mb-3">Set Your Location</h4>
                <p className="body-2 text-n-4 mb-6">We'll try to detect your location automatically</p>
                <motion.div
                  className="flex items-center justify-center"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <div className="w-2 h-2 bg-color-1 rounded-full"></div>
                </motion.div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-4 h-96 md:h-[500px] lg:h-[700px] rounded-xl overflow-hidden border border-n-6 relative">
          {(isLoading || isGenerating) && (
            <div className="absolute inset-0 bg-n-8/80 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-color-1 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="body-2 text-n-4">
                  {isGenerating ? "Generating your route..." : "Updating location..."}
                </p>
                {isGenerating && (
                  <div className="flex justify-center gap-1 mt-2">
                    <div className="w-1 h-1 bg-color-1 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-color-1 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-color-1 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>
            </div>
          )}
          <MapContainer 
            center={location} 
            zoom={13} 
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
            zoomControl={false}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            className="rounded-xl"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
            />
            
            {/* Current Location Marker. This will only show if location is set and no route generated */}
            {location && !routeData && (
              <Marker position={location}>
                <Popup>
                  <div className="text-sm text-center">
                    <strong>Current Location</strong><br />
                    Click "Generate Route" to create your cycling route
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Route Start and Destination Markers */}
            {routeData && routeData.route && routeData.route.length > 0 && (
              <>
                {/* Start Marker */}
                <Marker 
                  position={[routeData.route[0].lat, routeData.route[0].lon]}
                >
                  <Popup>
                    <div className="text-sm text-center">
                      <strong>Route Start</strong>
                    </div>
                  </Popup>
                </Marker>
                
                {/* Destination Marker */}
                <Marker 
                  position={[
                    routeData.route[routeData.route.length - 1].lat, 
                    routeData.route[routeData.route.length - 1].lon
                  ]}
                >
                  <Popup>
                    <div className="text-sm text-center">
                      <strong>Destination</strong><br />
                      <span className="text-xs text-gray-600">
                        Total distance: {routeData.total_length_formatted || `${routeData.total_length_km?.toFixed(1)} km`}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}
            
            {/* Display route polyline if route data is available */}
            {routeData && routeData.route && (
              <Polyline
                positions={routeData.route.map(point => [point.lat, point.lon])}
                color="#3B82F6"
                weight={4}
                opacity={0.8}
                smoothFactor={1}
              />
            )}
            
            <LocationControl 
              onLocationFound={(newLocation) => {
                setLocation(newLocation);
                setShowPreciseLocationPrompt(false);
                setError(null); // Clear any existing errors when location is found
              }}
              onLocationError={setError}
            />
            <ZoomControl />
            <RecenterMap center={location} />
            <MapResizeHandler />
          </MapContainer>
        </div>
      )}
    </motion.div>
  );
}

export default MapComponent