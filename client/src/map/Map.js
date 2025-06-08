import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function Map({ rides }) {
  const defaultCenter = [39.9526, -75.1652]; // Philadelphia
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
            Type: {ride.rideType}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default Map;