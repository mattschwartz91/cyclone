import React from 'react'
import MapComponent from '../components/MapComponent'

import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
export default function Map({ waypoints = [] }) {
  const validWaypoints = Array.isArray(waypoints)
    ? waypoints.filter(wp => wp && typeof wp.lat === 'number' && typeof wp.lon === 'number')
    : [];

  const center = validWaypoints.length > 0
    ? [validWaypoints[0].lat, validWaypoints[0].lon]
    : [0, 0];

  return (
    <MapContainer center={center} zoom={13} style={{ height: "400px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {validWaypoints.map((wp, idx) => (
        <Marker key={idx} position={[wp.lat, wp.lon]} />
      ))}
      {validWaypoints.length > 1 && (
        <Polyline positions={validWaypoints.map(wp => [wp.lat, wp.lon])} />
      )}
    </MapContainer>
  );
}
/*const Map = () => {
  return (
    <div className="bg-base min-h-screen text-gray-800">
        <MapComponent/>
    </div>
    
    
  )
}

export default Map*/