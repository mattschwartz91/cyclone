// components/GpxLoader.jsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-gpx';

export default function GpxLoader({ setWaypoints, setRawStats, setCueSheet }) {
    /*const map = useMap();

    useEffect(() => {
        const gpx = new L.GPX('/chill_hills.gpx', {
            async: true,
            marker_options: { startIconUrl: null, endIconUrl: null, shadowUrl: null },
            polyline_options: { color: '#4ED7F1', weight: 4 },
        });

        gpx.on('loaded', function (e) {
            map.fitBounds(e.target.getBounds());
            onStatsReady({
                distanceKm: e.target.get_distance() / 1000,
                elevationM: e.target.get_elevation_gain(),
            });
            onCuesReady(
                e.target.get_segments().flatMap((seg) =>
                    seg.points.map((pt) => pt.name).filter(Boolean)
                )
            );
        });

        gpx.addTo(map);
    }, [map, onStatsReady, onCuesReady]);*/

    useEffect(() => {
    console.log('GpxLoader: Loading route data');
    try {
      const waypoints = [
        { lat: 40.7128, lon: -74.0060 },
        { lat: 40.7138, lon: -74.0070 },
      ];
      const rawStats = { distanceKm: 10, elevationM: 100, name: 'Chill Hills' };
      const cueSheet = [
        { instruction: 'Start', distance: 0 },
        { instruction: 'Turn right', distance: 500 },
      ];

      console.log('GpxLoader: Setting data', { waypoints, rawStats, cueSheet });
      setWaypoints(waypoints);
      setRawStats(rawStats);
      setCueSheet(cueSheet);
    } catch (err) {
      console.error('GpxLoader: Error setting data:', err);
    }
    }, [setWaypoints, setRawStats, setCueSheet]);

    return null;
}
