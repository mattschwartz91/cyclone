import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const geocodeAddress = async (address) => {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
  const data = await response.json();
  if (data.length > 0) {
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }
  return null;
};

function Map({ rides }) {
  const defaultCenter = [39.9526, -75.1652]; // Philadelphia
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    const loadMarkers = async () => {
      const resolved = await Promise.all(
        rides.map(async (ride) => {
          const position = await geocodeAddress(ride.startAddress);
          return position ? { ...ride, position } : null;
        })
      );
      setMarkers(resolved.filter(Boolean));
    };
    loadMarkers();
  }, [rides]);

  return (
    <MapContainer center={defaultCenter} zoom={13} scrollWheelZoom={false} className="map-container">
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {rides.map(ride => (
        <Marker key={ride.id} position={defaultCenter}>
          <Popup>
            Ride {ride.id}: From {ride.startAddress} to {ride.endAddress} <br />
            From {ride.startAddress} <br />
            To {ride.endAddress} <br />
            Type: {ride.rideType}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default Map;