import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-gpx';

export default function GpxLoader({ waypoints = [], setWaypoints, onStatsReady, onCuesReady }) {
  const map = useMap();

  function calculateDistance(latlngs) {
    let total = 0;
    for (let i = 1; i < latlngs.length; i++) {
      const [lat1, lon1] = latlngs[i - 1];
      const [lat2, lon2] = latlngs[i];
      total += getDistance(lat1, lon1, lat2, lon2);
    }
    return total / 1000; // return in km
  }

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      const latlngs = waypoints.map(wp => [wp.lat, wp.lon]);

      const polyline = L.polyline(latlngs, {
        color: '#000000',
        weight: 4,
      }).addTo(map);

      map.fitBounds(polyline.getBounds());

      if (setWaypoints) {
        setWaypoints(waypoints);
      }

      if (onStatsReady) {
        const distanceKm = calculateDistance(latlngs);
        onStatsReady({ distanceKm, elevationM: 0 });
      }

      if (onCuesReady) {
        onCuesReady([]);
      }

      return () => {
        map.removeLayer(polyline);
      };
    }

    const gpx = new L.GPX('/chill_hills.gpx', {
      async: true,
      marker_options: { startIconUrl: null, endIconUrl: null, shadowUrl: null },
      polyline_options: { color: '#4ED7F1', weight: 4 },
    });

    gpx.on('loaded', function (e) {
      map.fitBounds(e.target.getBounds());

      if (onStatsReady) {
        onStatsReady({
          distanceKm: e.target.get_distance() / 1000,
          elevationM: e.target.get_elevation_gain(),
        });
      }

      if (onCuesReady) {
        onCuesReady(
          e.target.get_segments().flatMap(seg =>
            seg.points.map(pt => pt.name).filter(Boolean)
          )
        );
      }
    });

    gpx.addTo(map);

    return () => {
      map.removeLayer(gpx);
    };
  }, [map, waypoints, onStatsReady, onCuesReady]);

  return null;
}