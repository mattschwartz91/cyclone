import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-gpx';

export default function GpxLoader({ waypoints = [], setWaypoints, onStatsReady, onCuesReady }) {
  const map = useMap();

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
        onStatsReady({
          distanceKm: e.target.get_distance() / 1000,
          elevationM: e.target.get_elevation_gain(),
        });
      }

      if (onCuesReady) {
        e.target.get_segments().flatMap((seg) =>
        seg.points.map((pt) => pt.name).filter(Boolean))
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