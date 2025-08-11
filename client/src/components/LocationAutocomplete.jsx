import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LocationAutocomplete = ({ 
  value, 
  onChange, 
  placeholder, 
  className = "", 
  userLocation = null, 
  onLocationSelect = null,
  id = null,
  name = null,
  ariaLabel = null
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showCurrentLocationOption, setShowCurrentLocationOption] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        if (!value || value.trim() === '') {
          setShowCurrentLocationOption(true);
        } else {
          setShowCurrentLocationOption(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]); // Add value as dependency

  // Handle current location selection
  const handleCurrentLocationSelect = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          onChange('Current Location');
          if (onLocationSelect) {
            onLocationSelect(coords);
          }
          setShowSuggestions(false);
          setShowCurrentLocationOption(false);
          setIsLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to get your current location. Please ensure location services are enabled.");
          setIsLoading(false);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Formats location name for better display. Prioritizes business/location names
  const formatLocationName = (address) => {
    // First priority: Named places, businesses, and points of interest
    if (address?.name) return address.name;
    if (address?.amenity) return address.amenity;
    if (address?.shop) return address.shop;
    if (address?.tourism) return address.tourism;
    if (address?.leisure) return address.leisure;
    if (address?.office) return address.office;
    if (address?.building) return address.building;
    
    // Second priority: Specific addresses
    if (address?.house_number && address?.road) {
      return `${address.house_number} ${address.road}`;
    }
    
    // Third priority: Street names
    if (address?.road) return address.road;
    
    // Fourth priority: Area names
    if (address?.neighbourhood) return address.neighbourhood;
    if (address?.suburb) return address.suburb;
    
    // Last priority: City/town names
    if (address?.city) return address.city;
    if (address?.town) return address.town;
    if (address?.village) return address.village;
    
    return 'Location';
  };

  // Format secondary info (area, city, state) - show street address if primary is a business name
  const formatSecondaryInfo = (address) => {
    const parts = [];
    const primaryName = formatLocationName(address);
    
    // If primary name is a business/name of a place that exists, show the street address first
    if ((address?.name || address?.amenity || address?.shop || address?.tourism || 
         address?.leisure || address?.office || address?.building) && 
        address?.road && !primaryName.includes(address.road)) {
      if (address?.house_number) {
        parts.push(`${address.house_number} ${address.road}`);
      } else {
        parts.push(address.road);
      }
    }
    
    // Add neighborhood if different from primary name
    if (address?.neighbourhood && address.neighbourhood !== primaryName) {
      parts.push(address.neighbourhood);
    }
    
    // Add city/town
    const city = address?.city || address?.town || address?.village;
    if (city && city !== primaryName) {
      parts.push(city);
    }
    
    // Add state
    if (address?.state) {
      parts.push(address.state);
    }
    
    return parts.slice(0, 3).join(', ');
  };

  // Ensure distance is a number before formatting
  const formatDistance = (distance) => {
    if (typeof distance === 'number') {
      return distance < 0.1
        ? `${Math.round(distance * 5280)} ft` // Convert miles to feet
        : `${distance.toFixed(1)} miles`;
    }
    return null;
  };

  const searchLocations = async (query) => {
    console.log('searchLocations called with:', query); // Debug log
    if (!query || query.length < 2) {
      console.log('Query too short, clearing suggestions'); // Debug log
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log("Searching for location:", query);
      
      // Build search query with location bias if user location is available
      let searchQuery = query;
      let extraParams = '';
      
      if (userLocation) {
        // Use viewbox to prioritize results near user location, but don't bound strictly
        const buffer = 0.05; // Buffer degree of around 3.5 miles based on user's current location
        
        // Handle both object format {lat, lng} and array format [lat, lng]
        const lat = userLocation.lat || userLocation[0];
        const lng = userLocation.lng || userLocation[1];
        
        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          // Use viewbox for prioritization and proximity for sorting, but don't bound results (bounded=0)
          // This way we still get distant results if no local ones are found
          extraParams = `&viewbox=${lng-buffer},${lat+buffer},${lng+buffer},${lat-buffer}&bounded=0&proximity=${lat},${lng}`;
          console.log("Using location bias with user location:", { lat, lng, buffer });
        } else {
          console.log("Invalid user location data:", userLocation);
        }
      }
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=15&addressdetails=1&extratags=1${extraParams}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Received raw suggestions:", data.length);

      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.warn("API response is not an array:", data);
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        return;
      }

      let formattedSuggestions = data.map(item => {
        const primaryName = formatLocationName(item.address);
        const secondaryInfo = formatSecondaryInfo(item.address);
        
        // Calculate distance if user location is available
        let distance = null;
        if (userLocation) {
          const lat = userLocation.lat || userLocation[0];
          const lng = userLocation.lng || userLocation[1];
          if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
            distance = calculateDistance(lat, lng, parseFloat(item.lat), parseFloat(item.lon));
          }
        }

        return {
          display_name: item.display_name,
          primary_name: primaryName,
          secondary_info: secondaryInfo,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          address: item.address,
          distance: formatDistance(distance), // Format distance for display
          class: item.class,
          type: item.type,
          relevanceScore: 0 // Placeholder for relevance score
        };
      });

      // Filter out very distant results if user location is available, but be more flexible
      if (userLocation) {
        const lat = userLocation.lat || userLocation[0];
        const lng = userLocation.lng || userLocation[1];
        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          // First, try to find local results within 25 miles
          const localResults = formattedSuggestions.filter(suggestion => 
            !suggestion.distance || suggestion.distance <= 25
          );
          
          // If we have few local results, include more distant ones to ensure good suggestions
          if (localResults.length < 3) {
            console.log("Few local results found, including distant locations");
            // Keep all results. Don't filter by distance if local results are sparse
            formattedSuggestions = formattedSuggestions;
          } else {
            // Use local results if we have enough
            formattedSuggestions = localResults;
          }
        }
      }
      
      // Sort by relevance score (descending), then by distance (ascending)
      formattedSuggestions.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return 0;
      });

      // Limit to 5 most relevant results
      const finalSuggestions = formattedSuggestions.slice(0, 5);
      setSuggestions(finalSuggestions);
      setShowSuggestions(finalSuggestions.length > 0);
      console.log("Final suggestions shown:", finalSuggestions.length, finalSuggestions);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const query = e.target.value;
    console.log('Input changed:', query); // Debug log
    onChange(query);

    // Hide current location option when user starts typing
    if (query.trim().length > 0) {
      setShowCurrentLocationOption(false);
    } else {
      setShowCurrentLocationOption(true);
    }

    // Debounce the API call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      console.log('Calling searchLocations with:', query); // Debug log
      searchLocations(query);
    }, 200);
  };

  const handleSuggestionSelect = (suggestion) => {
    onChange(suggestion.primary_name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    // Call the location select callback if provided
    if (onLocationSelect) {
      onLocationSelect({
        lat: suggestion.lat,
        lng: suggestion.lon,
        name: suggestion.primary_name,
        formatted_address: suggestion.display_name
      });
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || (!showCurrentLocationOption && suggestions.length === 0)) return;

    const totalOptions = suggestions.length + (showCurrentLocationOption ? 1 : 0);
    const minIndex = showCurrentLocationOption ? -1 : 0; // -1 for current location option

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > minIndex ? prev - 1 : minIndex);
        break;
      case 'Enter':
        e.preventDefault();
        if (showCurrentLocationOption && selectedIndex === -1) {
          handleCurrentLocationSelect();
        } else if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // Show current location option if input is empty or focused
            if (!value || value.trim() === '') {
              setShowCurrentLocationOption(true);
              setShowSuggestions(true);
            } else if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel || placeholder}
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-haspopup="listbox"
          role="combobox"
          className={`w-full px-4 py-3 pr-10 bg-n-7 border border-n-6 rounded-xl text-n-1 placeholder-n-4 focus:border-color-1 focus:outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(172,108,255,0.3)] focus:scale-105 ${className}`}
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-color-1 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Custom suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && (showCurrentLocationOption || suggestions.length > 0) && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-[9999] w-full mt-1 bg-n-8 border border-n-6 rounded-xl shadow-lg max-h-60 overflow-y-auto"
            style={{ zIndex: 9999 }}
          >
            {/* Current Location Option */}
            {showCurrentLocationOption && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0 }}
                className={`px-4 py-3 cursor-pointer transition-colors border-b border-n-7 ${
                  selectedIndex === -1 
                    ? 'bg-color-1/10 text-color-1' 
                    : 'hover:bg-n-7 text-n-2'
                }`}
                onClick={handleCurrentLocationSelect}
              >
                <div className="flex items-center">
                  <span className="mr-3 text-lg">📍</span>
                  <div>
                    <div className="font-medium">Current Location</div>
                    <div className="text-sm text-n-4">Use your current location</div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Search Results */}
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: (showCurrentLocationOption ? index + 1 : index) * 0.05 }}
                className={`px-4 py-3 cursor-pointer transition-colors border-b border-n-7 last:border-b-0 ${
                  index === selectedIndex 
                    ? 'bg-color-1/10 text-color-1' 
                    : 'hover:bg-n-7 text-n-2'
                }`}
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base text-n-1 truncate">
                      {suggestion.primary_name}
                    </div>
                    {suggestion.secondary_info && (
                      <div className="text-xs text-n-4 truncate mt-1">
                        {suggestion.secondary_info}
                      </div>
                    )}
                  </div>
                  {suggestion.distance !== null && (
                    <div className="text-xs text-color-1 font-medium ml-2 flex-shrink-0 bg-color-1/10 px-2 py-1 rounded">
                      {suggestion.distance}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocationAutocomplete;
