import React, {useState, useEffect} from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// recent map properly
function RecenterMap({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);

  return null; // renders nothing itself
}

const MapComponent = () => {
  
  // set up props
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  // set up button
  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const {latitude, longitude} = position.coords;
        setLocation([latitude, longitude]);
        setError(null);
      },
      (err) => {
        setError("Unable to retrieve your location.");
      }
    );

    if (!NavigationActivation.geolocation) {
      setError("Geolocation is not supported by your browser.")
      return;
    }    
  }

  // let user enter coordinates
  const dropPin = (event) => {
    
    event.preventDefault(); // no page reload

    // retrieve query
    const formData = new FormData(event.target);
    const query = formData.get("query");
    const [latitude, longitude] = query.split(',');

    // check for numbers
    if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      setError("Not a valid latitude and longitude!");
      return;
    }

    // set new location
    setLocation([parseFloat(latitude), parseFloat(longitude)]);
    setError(null);
  }

  
  
  return (
    <div className="width-1024px">
      
      {error && <p className="text-red-500">{error}</p>}

      {location && (
        <MapContainer className= "mt-4" center={location} zoom={13} style={{height:"400px", width: "800px"}}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker position={location}>
              <Popup>{location}</Popup>
            </Marker>

            <RecenterMap center={location} />
        </MapContainer>
      )}
      <div className='flex p-2 bg-white text-black rounded mt-4 mb-4 p-4 align-center'>
        <button onClick={getLocation}>Get My Location</button>
      
        <form onSubmit={dropPin}>
          <input className="border ml-4 mr-2" name="query" />
          <button type="submit">Search</button>
        </form>
      </div>

      
    
    </div>

    
  )
}

export default MapComponent